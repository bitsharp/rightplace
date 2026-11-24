-- 0039 — Direct messages between friends (prompt 23).
-- Principles 1, 5, 6, 7: only people linked by an accepted follow (either direction, no block) can write to each
-- other; a block or a dropped follow closes the conversation at once; every message is deleted 7 days after it is
-- sent by a server job; the push never carries the text. Decision: message ids are uuid (not bigint) because
-- public.reports.target_id is a uuid and DMs are reportable.

-- ---------------------------------------------------------------- tables

create table public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index dm_threads_user_b_idx on public.dm_threads (user_b);
comment on table public.dm_threads is 'One conversation per pair of friends, ordered user_a < user_b. Written only by open_dm_thread / send_dm.';

create table public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  text text not null check (char_length(btrim(text)) between 1 and 1000),
  -- clock_timestamp: messages of one transaction keep their order
  created_at timestamptz not null default clock_timestamp()
);
create index dm_messages_thread_idx on public.dm_messages (thread_id, created_at desc);
comment on table public.dm_messages is 'Text and emoji only, deleted 7 days after sending by private.purge_expired_dms. Written only by send_dm.';

create table public.dm_reads (
  thread_id uuid not null references public.dm_threads (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_at timestamptz not null,
  primary key (thread_id, user_id)
);

alter table public.dm_threads enable row level security;
alter table public.dm_messages enable row level security;
alter table public.dm_reads enable row level security;
revoke all on public.dm_threads, public.dm_messages, public.dm_reads from public, anon, authenticated;
grant select on public.dm_threads, public.dm_messages to authenticated;

-- ---------------------------------------------------------------- the rule, once

-- A member of the thread who is still linked to the other one. The policies (and so Realtime) and every RPC use it.
create or replace function private.can_read_dm_thread(p_thread uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.dm_threads t
     where t.id = p_thread and auth.uid() in (t.user_a, t.user_b) and private.is_linked(t.user_a, t.user_b)
  )
$$;
comment on function private.can_read_dm_thread(uuid) is
  'Privacy: true only for a member of the thread who still has an accepted follow with the other member (either direction) and no block.';

create policy dm_threads_read on public.dm_threads for select to authenticated using (private.can_read_dm_thread(id));
create policy dm_messages_read on public.dm_messages for select to authenticated
  using (private.can_read_dm_thread(thread_id) and created_at > now() - interval '7 days');

-- ---------------------------------------------------------------- RPC

create or replace function public.open_dm_thread(p_handle text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_other uuid;
  v_thread uuid;
begin
  select p.id into v_other from public.profiles p
   where p.handle = lower(trim(leading '@' from trim(coalesce(p_handle, '')))) and p.deleted_at is null;
  if v_other = v_me then raise exception 'SELF' using errcode = 'P0001'; end if;
  -- unknown handle, stranger, pending request and block all answer the same: nothing is revealed
  if v_other is null or not private.is_linked(v_me, v_other) then
    raise exception 'NOT_LINKED' using errcode = 'P0001';
  end if;
  insert into public.dm_threads (user_a, user_b) values (least(v_me, v_other), greatest(v_me, v_other))
  on conflict (user_a, user_b) do nothing;
  select t.id into v_thread from public.dm_threads t
   where t.user_a = least(v_me, v_other) and t.user_b = greatest(v_me, v_other);
  return v_thread;
end $$;
comment on function public.open_dm_thread(text) is
  'Privacy: opens (or finds) the thread with an accepted-follow friend only; unknown handle, stranger, pending request and block all raise NOT_LINKED.';

create or replace function public.send_dm(p_thread uuid, p_text text) returns table (id uuid, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_me uuid := private.require_user();
  v_text text := nullif(btrim(p_text), '');
begin
  if not private.can_read_dm_thread(p_thread) then raise exception 'NOT_LINKED' using errcode = 'P0001'; end if;
  if v_text is null or char_length(v_text) > 1000 then raise exception 'INVALID_TEXT' using errcode = 'P0001'; end if;
  if (select count(*) from public.dm_messages m
       where m.sender_id = v_me and m.created_at > clock_timestamp() - interval '1 minute') >= 30 then
    raise exception 'RATE_LIMITED' using errcode = 'P0001';
  end if;
  update public.dm_threads t set last_message_at = clock_timestamp() where t.id = p_thread;
  return query
  insert into public.dm_messages (thread_id, sender_id, text) values (p_thread, v_me, v_text)
  returning dm_messages.id, dm_messages.created_at;
end $$;
comment on function public.send_dm(uuid, text) is
  'Privacy: members of a still-linked thread only; text 1-1000 chars, 30 messages per minute per sender; the only write path to dm_messages; queues a push without the text.';

create or replace function public.get_dm_threads(p_limit int default 50)
returns table (
  thread_id uuid, other_user_id uuid, other_handle text, last_text text, last_message_at timestamptz,
  last_sender_is_me boolean, unread boolean
)
language sql stable security definer set search_path = public as $$
  select t.id, o.id, o.handle, left(lm.text, 80), lm.created_at, lm.sender_id = auth.uid(),
         lm.sender_id <> auth.uid() and (r.last_read_at is null or lm.created_at > r.last_read_at)
    from public.dm_threads t
    join public.profiles o on o.id = case when t.user_a = auth.uid() then t.user_b else t.user_a end and o.deleted_at is null
    cross join lateral (
      select m.text, m.created_at, m.sender_id from public.dm_messages m
       where m.thread_id = t.id and m.created_at > now() - interval '7 days'
       order by m.created_at desc, m.id desc limit 1) lm
    left join public.dm_reads r on r.thread_id = t.id and r.user_id = auth.uid()
   where private.can_read_dm_thread(t.id)
   order by lm.created_at desc
   limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;
comment on function public.get_dm_threads(int) is
  'Privacy: the caller''s own still-linked conversations with at least one message younger than 7 days; the other person''s handle only, never email or exact age.';

create or replace function public.get_dm_messages(p_thread uuid, p_before timestamptz default null, p_limit int default 50)
returns table (id uuid, sender_is_me boolean, sender_id uuid, text text, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.id, m.sender_id = auth.uid(), m.sender_id, m.text, m.created_at
    from public.dm_messages m
   where m.thread_id = p_thread and private.can_read_dm_thread(p_thread)
     and m.created_at > now() - interval '7 days'
     and (p_before is null or m.created_at < p_before)
   order by m.created_at desc, m.id desc
   limit least(greatest(coalesce(p_limit, 50), 1), 100)
$$;
comment on function public.get_dm_messages(uuid, timestamptz, int) is
  'Privacy: messages younger than 7 days of a thread the caller belongs to and is still linked in; empty otherwise (a block or a dropped follow closes it at once).';

create or replace function public.mark_dm_read(p_thread uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := private.require_user();
begin
  if not private.can_read_dm_thread(p_thread) then raise exception 'NOT_LINKED' using errcode = 'P0001'; end if;
  insert into public.dm_reads (thread_id, user_id, last_read_at) values (p_thread, v_me, clock_timestamp())
  on conflict (thread_id, user_id) do update set last_read_at = excluded.last_read_at;
end $$;
comment on function public.mark_dm_read(uuid) is
  'Privacy: writes only the caller''s own read marker, for a thread the caller belongs to and is still linked in.';

create or replace function public.get_dm_unread_count() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.get_dm_threads(100) where unread
$$;
comment on function public.get_dm_unread_count() is
  'Privacy: number of the caller''s own conversations with an unread message from the other person (badge of the Chat tab); no content.';

revoke all on function public.open_dm_thread(text), public.send_dm(uuid, text), public.get_dm_threads(int),
  public.get_dm_messages(uuid, timestamptz, int), public.mark_dm_read(uuid), public.get_dm_unread_count()
  from public, anon, authenticated;
grant execute on function public.open_dm_thread(text), public.send_dm(uuid, text), public.get_dm_threads(int),
  public.get_dm_messages(uuid, timestamptz, int), public.mark_dm_read(uuid), public.get_dm_unread_count()
  to authenticated, service_role;

-- Realtime evaluates the select policy per subscriber: a blocked or unlinked friend stops receiving at once.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dm_messages') then
    alter publication supabase_realtime add table public.dm_messages;
  end if;
end $$;

-- ---------------------------------------------------------------- push: category `dm`, channel `messaggi`

alter table private.notification_queue drop constraint notification_queue_category_check;
alter table private.notification_queue add constraint notification_queue_category_check
  check (category in ('friends', 'chat', 'feed', 'creator', 'support', 'dm'));

create or replace function private.default_notification_prefs() returns jsonb
language sql immutable as $$
  select '{"reminder": true, "day_after": true, "friends": true, "chat": true, "feed": true, "creator": true, "dm": true,
           "reminder_days": [0, 1, 2, 3, 4, 5, 6], "reminder_time": "18:00"}'::jsonb
$$;

create or replace function private.valid_notification_prefs(p_prefs jsonb) returns boolean
language plpgsql immutable as $$
declare v_key text; v_value jsonb;
begin
  if p_prefs is null or jsonb_typeof(p_prefs) <> 'object' then return false; end if;
  for v_key, v_value in select * from jsonb_each(p_prefs) loop
    if v_key in ('reminder', 'day_after', 'friends', 'chat', 'feed', 'creator', 'support', 'dm') then
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

create or replace function private.push_channel(p_category text) returns text
language sql immutable as $$
  select case p_category when 'friends' then 'amici' when 'chat' then 'chat' when 'feed' then 'feed'
                         when 'support' then 'supporto' when 'dm' then 'messaggi' else 'creator' end
$$;

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
  elsif p_kind = 'dm_message' then
    -- the text of a direct message never travels in the push: handle and thread id only
    v_url := 'rightplace://dm/' || coalesce(p_params ->> 'thread_id', '');
    v_body := case
      when p_count = 1 and v_en then '@' || v_handle || ' sent you a message'
      when p_count = 1 then '@' || v_handle || ' ti ha scritto'
      when v_en then p_count || ' new messages from @' || v_handle
      else p_count || ' nuovi messaggi da @' || v_handle
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
  elsif p_kind = 'feedback_new' then
    v_url := 'rightplace://support/feedback';
    v_body := case
      when p_count = 1 and v_en then 'New feedback ' || private.rating_stars((p_params ->> 'rating')::int) || ' on ' || coalesce(p_params ->> 'screen', '')
      when p_count = 1 then 'Nuovo feedback ' || private.rating_stars((p_params ->> 'rating')::int) || ' su ' || coalesce(p_params ->> 'screen', '')
      when v_en then p_count || ' new feedback'
      else p_count || ' nuovi feedback'
    end;
  else
    return;
  end if;
  return query select 'RightPlace'::text, left(v_body, 200), v_url;
end $$;

-- One queue row per message, grouped by thread. enqueue_notification already skips the sender, a blocked pair,
-- a deleted account and a recipient who switched `dm` off.
create or replace function private.notify_dm_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_recipient uuid; v_handle text;
begin
  select case when t.user_a = new.sender_id then t.user_b else t.user_a end into v_recipient
    from public.dm_threads t where t.id = new.thread_id;
  select handle into v_handle from public.profiles where id = new.sender_id;
  perform private.enqueue_notification(v_recipient, 'dm', 'dm_message', 'dm:' || new.thread_id,
    jsonb_build_object('thread_id', new.thread_id, 'handle', v_handle), new.sender_id);
  return new;
end $$;
create trigger dm_messages_notify after insert on public.dm_messages
  for each row execute function private.notify_dm_message();

-- ---------------------------------------------------------------- moderation: DMs are reportable by their members

alter table public.reports drop constraint if exists reports_target_kind_check;
alter table public.reports add constraint reports_target_kind_check
  check (target_kind in ('post', 'message', 'user', 'event', 'comment', 'spot', 'dm'));

create or replace function public.report(p_target_kind text, p_target_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := private.require_user();
begin
  if p_target_kind not in ('post', 'message', 'user', 'event', 'comment', 'spot', 'dm') or p_target_id is null then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  if p_target_kind = 'spot' and not exists (select 1 from public.venues where id = p_target_id and kind = 'spot') then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  -- a member may report even after the friendship ended (the block that ended it must not silence the report)
  if p_target_kind = 'dm' and not exists (
    select 1 from public.dm_messages m join public.dm_threads t on t.id = m.thread_id
     where m.id = p_target_id and v_me in (t.user_a, t.user_b)) then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  insert into public.reports (reporter_id, target_kind, target_id, reason)
  values (v_me, p_target_kind, p_target_id, left(p_reason, 500));
end $$;
comment on function public.report(text, uuid, text) is
  'Privacy: reports are readable only by moderators (service role), never by other users; a spot reported by 3 distinct users is hidden; a direct message can be reported only by a member of its thread.';

-- ---------------------------------------------------------------- purge: 7 days (principle 5)

create or replace function private.purge_expired_dms() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.dm_messages where created_at < now() - interval '7 days';
  -- an empty thread lives one hour (the time to write the first message), then goes
  delete from public.dm_threads t
   where t.created_at < now() - interval '1 hour'
     and not exists (select 1 from public.dm_messages m where m.thread_id = t.id);
end $$;

-- ---------------------------------------------------------------- privileges and jobs

revoke all on function private.can_read_dm_thread(uuid), private.notify_dm_message(), private.purge_expired_dms()
  from public, anon, authenticated;
-- the policies run as the caller: only the auth.uid() wrapper is executable (the nested calls run as the owner)
grant execute on function private.can_read_dm_thread(uuid) to authenticated;

select cron.schedule('purge-expired-dms', '*/10 * * * *', 'select private.purge_expired_dms()');
