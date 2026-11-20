-- 0033 — The support team receives feedback inside the app: a push to every support account and an inbox
-- screen. Support accounts are set only with SQL by Luca (`update public.profiles set is_support = true …`):
-- the column is not in the clients' update grant and is not exposed to other users.

alter table public.profiles add column is_support boolean not null default false;
comment on column public.profiles.is_support is
  'Support team member: reads the feedback inbox and gets a push per feedback. Set only with SQL by the owner; never writable by clients, never exposed to others.';

-- ---------------------------------------------------------------- notification category `support`

alter table private.notification_queue drop constraint notification_queue_category_check;
alter table private.notification_queue add constraint notification_queue_category_check
  check (category in ('friends', 'chat', 'feed', 'creator', 'support'));

create or replace function private.valid_notification_prefs(p_prefs jsonb) returns boolean
language plpgsql immutable as $$
declare v_key text; v_value jsonb;
begin
  if p_prefs is null or jsonb_typeof(p_prefs) <> 'object' then return false; end if;
  for v_key, v_value in select * from jsonb_each(p_prefs) loop
    if v_key in ('reminder', 'day_after', 'friends', 'chat', 'feed', 'creator', 'support') then
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

create or replace function private.rating_stars(p_rating int) returns text
language sql immutable as $$
  select repeat('★', least(greatest(coalesce(p_rating, 0), 0), 5)) || repeat('☆', 5 - least(greatest(coalesce(p_rating, 0), 0), 5))
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

create or replace function private.push_channel(p_category text) returns text
language sql immutable as $$
  select case p_category when 'friends' then 'amici' when 'chat' then 'chat' when 'feed' then 'feed'
                         when 'support' then 'supporto' else 'creator' end
$$;

-- A category switched off (or an account deleted, or a support account demoted) while rows wait: DELETED, never sent.
create or replace function private.dismiss_disabled_notifications() returns void
language sql security definer set search_path = public as $$
  delete from private.notification_queue q
   using public.profiles p
   where p.id = q.user_id and q.sent_at is null
     and (p.deleted_at is not null
          or not coalesce((p.notification_prefs ->> q.category)::boolean, true)
          or (q.category = 'support' and not p.is_support))
$$;

-- ---------------------------------------------------------------- one queue row per support account per feedback

-- Only rating and screen path travel in params: never the comment, the screenshot or the author. Support gets the
-- push even when it blocked the author (it is work), but never for its own feedback.
create or replace function private.notify_support_of_feedback() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_support uuid;
begin
  for v_support in
    select p.id from public.profiles p where p.is_support and p.deleted_at is null and p.id <> new.user_id
  loop
    perform private.enqueue_notification(v_support, 'support', 'feedback_new', 'feedback',
      jsonb_build_object('rating', new.rating, 'screen', new.screen));
  end loop;
  return new;
end $$;

create trigger feedback_notify_support after insert on public.feedback
  for each row execute function private.notify_support_of_feedback();

-- ---------------------------------------------------------------- inbox

create or replace function public.get_support_feedback(p_before timestamptz default null, p_limit int default 30)
returns table (
  id uuid, rating smallint, comment text, screen text, has_screenshot boolean, app_version text,
  platform text, locale text, created_at timestamptz, author_handle text
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not exists (select 1 from public.profiles p where p.id = private.require_user() and p.is_support) then
    raise exception 'NOT_SUPPORT' using errcode = 'P0001';
  end if;
  return query
  select f.id, f.rating, f.comment, f.screen, f.screenshot_path is not null, f.app_version, f.platform, f.locale,
         f.created_at, a.handle
    from public.feedback f join public.profiles a on a.id = f.user_id
   where p_before is null or f.created_at < p_before
   order by f.created_at desc, f.id desc
   limit least(greatest(coalesce(p_limit, 30), 1), 50);
end $$;
comment on function public.get_support_feedback(timestamptz, int) is
  'Privacy: only for support accounts (NOT_SUPPORT otherwise); returns the author''s handle, never email or user id; the screenshot is reached only through get_feedback_screenshot_paths.';

create or replace function public.get_feedback_screenshot_paths(p_ids uuid[])
returns table (feedback_id uuid, screenshot_path text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not exists (select 1 from public.profiles p where p.id = private.require_user() and p.is_support) then
    raise exception 'NOT_SUPPORT' using errcode = 'P0001';
  end if;
  if coalesce(array_length(p_ids, 1), 0) > 50 then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  return query
  select f.id, f.screenshot_path from public.feedback f
   where f.id = any (p_ids) and f.screenshot_path is not null;
end $$;
comment on function public.get_feedback_screenshot_paths(uuid[]) is
  'Privacy: storage paths of feedback screenshots only for support accounts (NOT_SUPPORT otherwise), max 50; used by the feedback-screenshot-urls Edge Function, which signs them for 1 hour.';

revoke all on function public.get_support_feedback(timestamptz, int), public.get_feedback_screenshot_paths(uuid[])
  from public, anon;
grant execute on function public.get_support_feedback(timestamptz, int), public.get_feedback_screenshot_paths(uuid[])
  to authenticated, service_role;
revoke all on function private.rating_stars(int), private.notify_support_of_feedback()
  from public, anon, authenticated;
