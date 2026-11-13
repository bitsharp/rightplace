-- 0023 — Notifications (prompt 15): preferences, push tokens, a coalescing queue, the dispatcher that
-- calls the send-push Edge Function, and the in-app activity list.
-- Principles 1 and 6 apply to every recipient: nobody is notified about people they cannot see, and the payload
-- never carries message text, photos or exact attendance numbers.

-- ---------------------------------------------------------------- preferences

create or replace function private.default_notification_prefs() returns jsonb
language sql immutable as $$
  select '{"reminder": true, "day_after": true, "friends": true, "chat": true, "feed": true, "creator": true,
           "reminder_days": [0, 1, 2, 3, 4, 5, 6], "reminder_time": "18:00"}'::jsonb
$$;

alter table public.profiles add column notification_prefs jsonb not null default private.default_notification_prefs();
comment on column public.profiles.notification_prefs is
  'Per-category switches (reminder, day_after, friends, chat, feed, creator) and the evening reminder schedule (weekdays 0=Sunday, HH:MM in 15-minute steps). Written only by set_my_notification_prefs.';

create or replace function private.valid_reminder_days(p_days jsonb) returns boolean
language plpgsql immutable as $$
begin
  if jsonb_typeof(p_days) <> 'array' then return false; end if;
  if exists (select 1 from jsonb_array_elements(p_days) e where jsonb_typeof(e) <> 'number' or (e #>> '{}') !~ '^[0-6]$') then
    return false;
  end if;
  return (select count(distinct e) = count(*) from jsonb_array_elements(p_days) e);
end $$;

create or replace function private.valid_notification_prefs(p_prefs jsonb) returns boolean
language plpgsql immutable as $$
declare v_key text; v_value jsonb;
begin
  if p_prefs is null or jsonb_typeof(p_prefs) <> 'object' then return false; end if;
  for v_key, v_value in select * from jsonb_each(p_prefs) loop
    if v_key in ('reminder', 'day_after', 'friends', 'chat', 'feed', 'creator') then
      if jsonb_typeof(v_value) <> 'boolean' then return false; end if;
    elsif v_key = 'reminder_days' then
      if not private.valid_reminder_days(v_value) then return false; end if;
    elsif v_key = 'reminder_time' then
      if jsonb_typeof(v_value) <> 'string' or (v_value #>> '{}') !~ '^([01][0-9]|2[0-3]):(00|15|30|45)$' then return false; end if;
    else
      return false;
    end if;
  end loop;
  return true;
end $$;

create or replace function public.get_my_notification_prefs() returns jsonb
language sql stable security definer set search_path = public as $$
  select private.default_notification_prefs() || p.notification_prefs from public.profiles p where p.id = private.require_user()
$$;
comment on function public.get_my_notification_prefs() is
  'Privacy: the caller''s own notification preferences, completed with the defaults.';

create or replace function public.set_my_notification_prefs(p_prefs jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_me uuid := private.require_user(); v_result jsonb;
begin
  if not private.valid_notification_prefs(p_prefs) then
    raise exception 'INVALID_PREFS' using errcode = 'P0001';
  end if;
  update public.profiles p set notification_prefs = p.notification_prefs || p_prefs where p.id = v_me
  returning private.default_notification_prefs() || p.notification_prefs into v_result;
  return v_result;
end $$;
comment on function public.set_my_notification_prefs(jsonb) is
  'Privacy: updates only the caller''s own preferences; unknown keys and wrong types are rejected (INVALID_PREFS). The server checks these switches before queueing and again before sending.';

-- ---------------------------------------------------------------- push tokens

create or replace function public.register_push_token(p_token text, p_platform text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := private.require_user();
begin
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception 'INVALID_TOKEN' using errcode = 'P0001';
  end if;
  if p_platform is null or p_platform not in ('ios', 'android') then
    raise exception 'INVALID_PLATFORM' using errcode = 'P0001';
  end if;
  -- the same phone can be signed into another account: the token follows whoever registers it last
  insert into public.push_tokens (user_id, token, platform) values (v_me, p_token, p_platform)
  on conflict (token) do update set user_id = excluded.user_id, platform = excluded.platform, updated_at = now();
end $$;
comment on function public.register_push_token(text, text) is
  'Privacy: stores a push token for the caller only (re-assigning it if another account had it); tokens are never returned by any RPC.';

create or replace function public.unregister_push_token(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from public.push_tokens where token = p_token and user_id = private.require_user()
$$;
comment on function public.unregister_push_token(text) is
  'Privacy: removes one of the caller''s own tokens (sign-out); someone else''s token is never touched.';

-- ---------------------------------------------------------------- queue and log (no client access)

create table private.notification_queue (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  category text not null check (category in ('friends', 'chat', 'feed', 'creator')),
  kind text not null,
  group_key text not null,
  params jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index notification_queue_due_idx on private.notification_queue (sent_at, user_id);
comment on table private.notification_queue is 'Pending pushes. params holds ids, handles and names only: never message text, photos or exact counts.';

create table private.push_log (
  user_id uuid not null references public.profiles (id) on delete cascade,
  group_key text not null,
  sent_at timestamptz not null default now()
);
create index push_log_recent_idx on private.push_log (user_id, group_key, sent_at desc);

-- last attendance band notified to a creator per event: a band is announced once, never on the way down
create table private.event_band_notified (
  event_id uuid primary key references public.events (id) on delete cascade,
  band_rank int not null
);
revoke all on private.notification_queue, private.push_log, private.event_band_notified from public, anon, authenticated;
revoke all on sequence private.notification_queue_id_seq from public, anon, authenticated;

create or replace function private.band_rank(p_band text) returns int
language sql immutable as $$
  select coalesce(array_position(array['pochi', '3–10', '10–20', '20–30', '30–50', '50–100', '100+'], p_band), 1) - 1
$$;

-- Single entry point for every trigger: honours the recipient's switch, never notifies the actor about their own
-- action and never crosses a block.
create or replace function private.enqueue_notification(
  p_user uuid, p_category text, p_kind text, p_group_key text, p_params jsonb, p_actor uuid default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or p_user = p_actor then return; end if;
  if p_actor is not null and private.is_blocked_pair(p_user, p_actor) then return; end if;
  if not exists (
    select 1 from public.profiles p
     where p.id = p_user and p.deleted_at is null and coalesce((p.notification_prefs ->> p_category)::boolean, true)
  ) then return; end if;
  insert into private.notification_queue (user_id, category, kind, group_key, params)
  values (p_user, p_category, p_kind, p_group_key, p_params);
end $$;

-- ---------------------------------------------------------------- chat visibility with an explicit viewer

-- Triggers run without the recipient's auth.uid(), so the rule takes the viewer as an argument.
-- Prompt 19 (friends of friends inside a room) changes THIS function and nothing else.
create or replace function private.can_see_chat_author_for(p_viewer uuid, p_author uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (p_author = p_viewer or private.is_following(p_viewer, p_author))
     and not private.is_blocked_pair(p_viewer, p_author)
$$;

create or replace function private.can_see_chat_author(p_author uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select private.can_see_chat_author_for(auth.uid(), p_author)
$$;

-- ---------------------------------------------------------------- triggers

create or replace function private.notify_follow_request() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.enqueue_notification(new.followee_id, 'friends', 'follow_request', 'follow_requests',
    jsonb_build_object('handle', (select handle from public.profiles where id = new.follower_id)), new.follower_id);
  return new;
end $$;
create trigger follows_notify_request after insert on public.follows
  for each row when (new.status = 'pending') execute function private.notify_follow_request();

create or replace function private.notify_follow_accepted() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform private.enqueue_notification(new.follower_id, 'friends', 'follow_accepted', 'accepted:' || new.followee_id,
    jsonb_build_object('handle', (select handle from public.profiles where id = new.followee_id)), new.followee_id);
  return new;
end $$;
create trigger follows_notify_accepted after update of status on public.follows
  for each row when (old.status = 'pending' and new.status = 'accepted') execute function private.notify_follow_accepted();

-- One row per recipient who can see the author (principle 6); the text and the photo are never copied.
create or replace function private.notify_chat_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_venue text; v_handle text; v_member uuid;
begin
  select v.name into v_venue
    from public.chat_rooms r
    left join public.nights n on n.id = r.night_id
    left join public.events e on e.id = r.event_id
    join public.venues v on v.id = coalesce(n.venue_id, e.venue_id)
   where r.id = new.room_id;
  select handle into v_handle from public.profiles where id = new.user_id;
  for v_member in
    select distinct d.user_id
      from public.chat_rooms r join public.declarations d on (d.night_id = r.night_id or d.event_id = r.event_id)
     where r.id = new.room_id and r.expires_at > now() and d.user_id <> new.user_id
  loop
    if private.can_see_chat_author_for(v_member, new.user_id) then
      perform private.enqueue_notification(v_member, 'chat', 'chat_message', 'room:' || new.room_id,
        jsonb_build_object('room_id', new.room_id, 'venue_name', v_venue, 'handle', v_handle), new.user_id);
    end if;
  end loop;
  return new;
end $$;
create trigger chat_messages_notify after insert on public.chat_messages
  for each row execute function private.notify_chat_message();

-- Creators hear about bands (3–10, 10–20, ...), never about a single person: bands start at k = 3.
create or replace function private.notify_event_attendance() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_event public.events; v_rank int; v_changed int;
begin
  if new.event_id is null or new.intent <> 'going' then return new; end if;
  select * into v_event from public.events where id = new.event_id and cancelled_at is null;
  if not found or v_event.creator_id = new.user_id then return new; end if;
  v_rank := private.band_rank(public.attendance_band((select going from private.event_counts(new.event_id))));
  if v_rank = 0 then return new; end if;
  insert into private.event_band_notified (event_id, band_rank) values (new.event_id, v_rank)
  on conflict (event_id) do update set band_rank = excluded.band_rank where private.event_band_notified.band_rank < excluded.band_rank;
  get diagnostics v_changed = row_count;
  if v_changed > 0 then
    perform private.enqueue_notification(v_event.creator_id, 'creator', 'attendance_band', 'event:' || v_event.id,
      jsonb_build_object('event_id', v_event.id, 'event_name', v_event.name,
        'band', public.attendance_band((select going from private.event_counts(new.event_id)))));
  end if;
  return new;
end $$;
create trigger declarations_notify_attendance after insert or update of intent on public.declarations
  for each row execute function private.notify_event_attendance();

-- Who had declared (going or maybe) is told once, under the "Chat e serate" switch; the creator is not.
create or replace function private.notify_event_cancelled() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_user uuid;
begin
  for v_user in select distinct d.user_id from public.declarations d where d.event_id = new.id and d.user_id <> new.creator_id loop
    perform private.enqueue_notification(v_user, 'chat', 'event_cancelled', 'event_cancelled:' || new.id,
      jsonb_build_object('event_id', new.id, 'event_name', new.name));
  end loop;
  return new;
end $$;
create trigger events_notify_cancelled after update of cancelled_at on public.events
  for each row when (old.cancelled_at is null and new.cancelled_at is not null) execute function private.notify_event_cancelled();

-- ---------------------------------------------------------------- feed digest (hourly job, fires at 12:00 local)

create or replace function private.queue_feed_digests(p_now timestamptz default now()) returns int
language plpgsql security definer set search_path = public as $$
declare v_queued int;
begin
  with viewers as (
    select p.id as user_id, (p_now at time zone coalesce(c.timezone, 'Europe/Rome'))::date as local_date
      from public.profiles p left join public.cities c on c.id = p.city_id
     where p.deleted_at is null and coalesce((p.notification_prefs ->> 'feed')::boolean, true)
       and extract(hour from p_now at time zone coalesce(c.timezone, 'Europe/Rome')) = 12
  ), digest as (
    select v.user_id, v.local_date, count(distinct po.user_id)::int as authors
      from viewers v
      join public.follows f on f.follower_id = v.user_id and f.status = 'accepted'
      join public.profiles a on a.id = f.followee_id and a.deleted_at is null
      join public.posts po on po.user_id = f.followee_id and po.visible_from <= p_now
                          and po.visible_from > p_now - interval '24 hours' and po.expires_at > p_now
     where not private.is_blocked_pair(v.user_id, f.followee_id)
     group by v.user_id, v.local_date
  )
  insert into private.notification_queue (user_id, category, kind, group_key, params)
  select d.user_id, 'feed', 'feed_digest', 'feed_digest:' || d.local_date, jsonb_build_object('count', d.authors)
    from digest d
   where not exists (select 1 from private.notification_queue q
                      where q.user_id = d.user_id and q.group_key = 'feed_digest:' || d.local_date);
  get diagnostics v_queued = row_count;
  return v_queued;
end $$;

-- ---------------------------------------------------------------- texts (server side, in the user's language)

create or replace function private.render_notification(p_locale text, p_kind text, p_count int, p_params jsonb)
returns table (title text, body text, url text)
language plpgsql immutable as $$
declare
  v_en boolean := p_locale = 'en';
  v_handle text := coalesce(p_params ->> 'handle', '');
  v_event text := coalesce(p_params ->> 'event_name', '');
  v_venue text := coalesce(p_params ->> 'venue_name', '');
  v_friends int := coalesce((p_params ->> 'count')::int, 1);
  v_others boolean := coalesce((p_params ->> 'senders')::int, 1) > 1;
  v_body text; v_url text;
begin
  if p_kind = 'chat_message' then
    v_url := 'rightplace://night/' || coalesce(p_params ->> 'room_id', '') || '/chat';
    v_body := case
      when p_count = 1 and v_en then 'New message in the ' || v_venue || ' chat'
      when p_count = 1 then 'Nuovo messaggio nella chat di ' || v_venue
      when v_en then p_count || ' new messages from @' || v_handle || case when v_others then ' and others' else '' end
      else p_count || ' nuovi messaggi da @' || v_handle || case when v_others then ' e altri' else '' end
    end;
  elsif p_kind = 'follow_request' then
    v_url := 'rightplace://friends/requests';
    v_body := case
      when p_count = 1 and v_en then '@' || v_handle || ' wants to follow you'
      when p_count = 1 then '@' || v_handle || ' vuole seguirti'
      when v_en then p_count || ' new follow requests'
      else p_count || ' nuove richieste di follow'
    end;
  elsif p_kind = 'follow_accepted' then
    v_url := 'rightplace://u/' || v_handle;
    v_body := case when v_en then '@' || v_handle || ' accepted your request' else '@' || v_handle || ' ha accettato la tua richiesta' end;
  elsif p_kind = 'feed_digest' then
    v_url := 'rightplace://feed';
    v_body := case
      when v_en and v_friends = 1 then '1 friend posted photos from last night'
      when v_en then v_friends || ' friends posted photos from last night'
      when v_friends = 1 then '1 amico ha postato le foto di ieri'
      else v_friends || ' amici hanno postato le foto di ieri'
    end;
  elsif p_kind = 'attendance_band' then
    v_url := 'rightplace://creator';
    v_body := v_event || case when v_en then ': sign-ups ' else ': adesioni ' end || coalesce(p_params ->> 'band', '');
  elsif p_kind = 'event_cancelled' then
    v_url := 'rightplace://chat';
    v_body := v_event || case when v_en then ' has been cancelled' else ' è stata annullata' end;
  else
    return;
  end if;
  return query select 'RightPlace'::text, left(v_body, 200), v_url;
end $$;

create or replace function private.push_channel(p_category text) returns text
language sql immutable as $$
  select case p_category when 'friends' then 'amici' when 'chat' then 'chat' when 'feed' then 'feed' else 'creator' end
$$;

-- ---------------------------------------------------------------- dispatcher

create or replace function private.invoke_send_push(p_payload jsonb) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_url text; v_key text;
begin
  if to_regclass('vault.decrypted_secrets') is null or to_regnamespace('net') is null then
    raise notice 'send-push skipped: vault or pg_net not available';
    return false;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'send_push_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'send_push_key';
  if coalesce(v_url, '') = '' or coalesce(v_key, '') = '' then
    raise notice 'send-push skipped: send_push_url / send_push_key missing in Vault';
    return false;
  end if;
  perform net.http_post(url := v_url, body := p_payload,
    headers := jsonb_build_object('x-push-key', v_key, 'Content-Type', 'application/json'));
  return true;
end $$;

create or replace function private.purge_notification_queue(p_now timestamptz) returns void
language sql security definer set search_path = public as $$
  delete from private.notification_queue where coalesce(sent_at, created_at) < p_now - interval '2 days';
  delete from private.push_log where sent_at < p_now - interval '7 days';
$$;

-- A category switched off (or an account deleted) while rows wait: they are DELETED, never marked sent or sent.
create or replace function private.dismiss_disabled_notifications() returns void
language sql security definer set search_path = public as $$
  delete from private.notification_queue q
   using public.profiles p
   where p.id = q.user_id and q.sent_at is null
     and (p.deleted_at is not null or not coalesce((p.notification_prefs ->> q.category)::boolean, true))
$$;

-- Rows of the same (user, category, group) become ONE push. Chat rooms and follow requests are limited to one
-- push every 10 minutes: what arrives in between waits in the queue and joins the next push.
create or replace function private.due_notification_groups(p_now timestamptz)
returns table (user_id uuid, category text, group_key text, kind text, n int, ids bigint[], params jsonb, locale text)
language sql stable security definer set search_path = public as $$
  select q.user_id, q.category, q.group_key, (array_agg(q.kind order by q.id desc))[1], count(*)::int,
         array_agg(q.id order by q.id),
         (array_agg(q.params order by q.id desc))[1] || jsonb_build_object('senders', count(distinct q.params ->> 'handle')),
         p.locale
    from private.notification_queue q join public.profiles p on p.id = q.user_id
   where q.sent_at is null
     and not ((q.group_key like 'room:%' or q.group_key = 'follow_requests') and exists (
           select 1 from private.push_log l
            where l.user_id = q.user_id and l.group_key = q.group_key and l.sent_at > p_now - interval '10 minutes'))
   group by q.user_id, q.category, q.group_key, p.locale
   order by min(q.id)
   limit 500
$$;

-- Returns the number of push messages handed to send-push. Without Vault secrets nothing is sent and nothing is lost.
create or replace function private.dispatch_notifications(p_now timestamptz default now()) returns int
language plpgsql security definer set search_path = public as $$
declare v_group record; v_text record; v_messages jsonb := '[]'::jsonb; v_ids bigint[] := '{}';
begin
  perform private.purge_notification_queue(p_now);
  perform private.dismiss_disabled_notifications();
  for v_group in select * from private.due_notification_groups(p_now) loop
    select * into v_text from private.render_notification(v_group.locale, v_group.kind, v_group.n, v_group.params);
    continue when not found;
    v_messages := v_messages || jsonb_build_array(jsonb_build_object(
      'user_ids', jsonb_build_array(v_group.user_id), 'title', v_text.title, 'body', v_text.body,
      'data', jsonb_build_object('url', v_text.url), 'channel_id', private.push_channel(v_group.category)));
    v_ids := v_ids || v_group.ids;
  end loop;
  if jsonb_array_length(v_messages) = 0 or not private.invoke_send_push(jsonb_build_object('messages', v_messages)) then
    return 0;
  end if;
  insert into private.push_log (user_id, group_key, sent_at)
  select distinct q.user_id, q.group_key, p_now from private.notification_queue q where q.id = any (v_ids);
  update private.notification_queue set sent_at = p_now where id = any (v_ids);
  return jsonb_array_length(v_messages);
end $$;

-- ---------------------------------------------------------------- in-app activity (independent of push permission)

create or replace function public.get_my_activity(p_since timestamptz default now() - interval '7 days')
returns table (kind text, actor_handle text, post_id uuid, created_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_me uuid := private.require_user();
begin
  return query
  select a.kind, a.handle, a.post_id, a.created_at from (
    select 'like'::text as kind, p.handle, l.post_id, l.created_at, l.user_id as actor
      from public.post_likes l join public.posts po on po.id = l.post_id join public.profiles p on p.id = l.user_id
     where po.user_id = v_me and po.expires_at > now()
    union all
    select 'comment', p.handle, c.post_id, c.created_at, c.user_id
      from public.post_comments c join public.posts po on po.id = c.post_id join public.profiles p on p.id = c.user_id
     where po.user_id = v_me and po.expires_at > now()
    union all
    select 'follow_request', p.handle, null::uuid, f.created_at, f.follower_id
      from public.follows f join public.profiles p on p.id = f.follower_id
     where f.followee_id = v_me and f.status = 'pending'
    union all
    select 'follow_accepted', p.handle, null::uuid, f.responded_at, f.followee_id
      from public.follows f join public.profiles p on p.id = f.followee_id
     where f.follower_id = v_me and f.status = 'accepted' and f.responded_at is not null
  ) a
  join public.profiles ap on ap.id = a.actor and ap.deleted_at is null
  where a.actor <> v_me and a.created_at >= p_since and not private.is_blocked_pair(v_me, a.actor)
  order by a.created_at desc
  limit 50;
end $$;
comment on function public.get_my_activity(timestamptz) is
  'Privacy: likes and comments by others on the caller''s own live posts, pending requests to the caller and the caller''s accepted requests; handles only (never comment text), no blocked pairs, no deleted accounts, max 50.';

-- ---------------------------------------------------------------- privileges and jobs

revoke all on function public.get_my_notification_prefs(), public.set_my_notification_prefs(jsonb),
  public.register_push_token(text, text), public.unregister_push_token(text), public.get_my_activity(timestamptz)
  from public, anon, authenticated;
grant execute on function public.get_my_notification_prefs(), public.set_my_notification_prefs(jsonb),
  public.register_push_token(text, text), public.unregister_push_token(text), public.get_my_activity(timestamptz)
  to authenticated, service_role;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'private' and p.prokind = 'f'
       and p.proname in ('default_notification_prefs', 'valid_reminder_days', 'valid_notification_prefs', 'band_rank',
         'enqueue_notification', 'can_see_chat_author_for', 'can_see_chat_author', 'notify_follow_request',
         'notify_follow_accepted', 'notify_chat_message', 'notify_event_attendance', 'notify_event_cancelled',
         'queue_feed_digests', 'render_notification', 'push_channel', 'invoke_send_push', 'purge_notification_queue',
         'dismiss_disabled_notifications', 'due_notification_groups', 'dispatch_notifications')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', f.sig);
  end loop;
end $$;

select cron.schedule('dispatch-notifications', '* * * * *', 'select private.dispatch_notifications()');
select cron.schedule('queue-feed-digests', '5 * * * *', 'select private.queue_feed_digests()');
