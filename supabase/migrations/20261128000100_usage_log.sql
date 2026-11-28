-- 0043 — Prompt 26: usage log (logins and app sessions), readable only by the admin. Records ONLY when and for how
-- long the app was used, plus platform and app version: never screens, content, location, IP or device details.
-- Rows live 90 days (job) and vanish at once with the account.

alter table public.profiles add column is_admin boolean not null default false;
comment on column public.profiles.is_admin is
  'Administrator: reads the usage log. Set only with SQL by the owner; never writable by clients (not in the update grant), never exposed to others.';

create table public.usage_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('login', 'session')),
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at timestamptz,
  platform text check (platform in ('ios', 'android', 'web')),
  app_version text check (char_length(app_version) <= 32)
);
create index usage_events_user_started_idx on public.usage_events (user_id, started_at desc);
create index usage_events_started_idx on public.usage_events (started_at);
alter table public.usage_events enable row level security;
revoke all on public.usage_events from public, anon, authenticated;
comment on table public.usage_events is
  'Logins and app sessions (time, duration, platform, version). No policy and no grant: only the RPCs below touch it.';

-- ---------------------------------------------------------------- guards

create or replace function private.require_admin() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_me uuid := private.require_user();
begin
  if not exists (select 1 from public.profiles p where p.id = v_me and p.is_admin) then
    raise exception 'NOT_ADMIN' using errcode = 'P0001';
  end if;
  return v_me;
end $$;

create or replace function private.usage_platform(p_platform text) returns text
language plpgsql immutable as $$
begin
  if p_platform is null or p_platform not in ('ios', 'android', 'web') then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  return p_platform;
end $$;

-- ---------------------------------------------------------------- client RPCs

create or replace function public.log_login(p_platform text, p_app_version text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := private.require_user(); v_platform text := private.usage_platform(p_platform);
begin
  if (select count(*) from public.usage_events e
       where e.user_id = v_me and e.kind = 'login' and e.started_at > now() - interval '24 hours') >= 20 then
    return;
  end if;
  insert into public.usage_events (user_id, kind, started_at, last_seen_at, ended_at, platform, app_version)
  values (v_me, 'login', now(), now(), now(), v_platform, nullif(left(btrim(coalesce(p_app_version, '')), 32), ''));
end $$;
comment on function public.log_login(text, text) is
  'Privacy: records a login of the caller only (time, platform, app version); max 20 per day, extra calls ignored; no IP, device or location.';

create or replace function public.start_usage_session(p_platform text, p_app_version text) returns bigint
language plpgsql security definer set search_path = public as $$
declare v_me uuid := private.require_user(); v_platform text := private.usage_platform(p_platform); v_id bigint;
begin
  update public.usage_events set ended_at = last_seen_at
   where user_id = v_me and kind = 'session' and ended_at is null;
  if (select count(*) from public.usage_events e
       where e.user_id = v_me and e.kind = 'session' and e.started_at > now() - interval '24 hours') >= 200 then
    return null;
  end if;
  insert into public.usage_events (user_id, kind, platform, app_version)
  values (v_me, 'session', v_platform, nullif(left(btrim(coalesce(p_app_version, '')), 32), ''))
  returning id into v_id;
  return v_id;
end $$;
comment on function public.start_usage_session(text, text) is
  'Privacy: opens a usage session for the caller only (closes any still open); max 200 per day, then null; no screens, content or location.';

create or replace function public.touch_usage_session(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := private.require_user();
begin
  update public.usage_events set last_seen_at = now()
   where id = p_id and user_id = v_me and kind = 'session' and ended_at is null
     and last_seen_at < now() - interval '30 seconds';
end $$;
comment on function public.touch_usage_session(bigint) is
  'Privacy: refreshes last_seen_at of the caller''s own open session, at most once every 30 s; other people''s sessions are never touched.';

create or replace function public.end_usage_session(p_id bigint) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := private.require_user();
begin
  update public.usage_events set ended_at = now()
   where id = p_id and user_id = v_me and kind = 'session' and ended_at is null;
end $$;
comment on function public.end_usage_session(bigint) is
  'Privacy: closes the caller''s own open session; other people''s sessions are never touched.';

-- ---------------------------------------------------------------- admin RPCs

create or replace function public.get_usage_overview(p_days int default 30, p_search text default null)
returns table (
  user_id uuid, handle text, last_seen_at timestamptz, logins int, sessions int, total_minutes int,
  last_platform text, last_app_version text
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_since timestamptz := now() - make_interval(days => least(greatest(coalesce(p_days, 30), 1), 90));
        v_search text := lower(ltrim(btrim(coalesce(p_search, '')), '@'));
begin
  perform private.require_admin();
  return query
  select p.id, p.handle, agg.last_seen, agg.logins, agg.sessions, agg.minutes, lastev.platform, lastev.app_version
    from public.profiles p
    cross join lateral (
      select max(greatest(e.last_seen_at, e.ended_at)) as last_seen,
             (count(*) filter (where e.kind = 'login'))::int as logins,
             (count(*) filter (where e.kind = 'session'))::int as sessions,
             (floor(coalesce(sum(extract(epoch from coalesce(e.ended_at, e.last_seen_at) - e.started_at))
                filter (where e.kind = 'session'), 0) / 60))::int as minutes
        from public.usage_events e where e.user_id = p.id and e.started_at >= v_since
    ) agg
    cross join lateral (
      select e.platform, e.app_version from public.usage_events e
       where e.user_id = p.id and e.started_at >= v_since order by e.started_at desc, e.id desc limit 1
    ) lastev
   where p.deleted_at is null and agg.last_seen is not null
     and (v_search = '' or strpos(lower(p.handle), v_search) > 0)
   order by agg.last_seen desc, p.id
   limit 500;
end $$;
comment on function public.get_usage_overview(int, text) is
  'Privacy: only for the admin (NOT_ADMIN otherwise); per user handle, counts, minutes, last platform and version; never email, exact age or location.';

create or replace function public.get_user_usage(p_user uuid, p_before timestamptz default null, p_limit int default 50)
returns table (
  id bigint, kind text, started_at timestamptz, last_seen_at timestamptz, ended_at timestamptz, minutes int,
  platform text, app_version text
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  perform private.require_admin();
  return query
  select e.id, e.kind, e.started_at, e.last_seen_at, e.ended_at,
         (floor(extract(epoch from coalesce(e.ended_at, e.last_seen_at) - e.started_at) / 60))::int,
         e.platform, e.app_version
    from public.usage_events e
   where e.user_id = p_user and (p_before is null or e.started_at < p_before)
   order by e.started_at desc, e.id desc
   limit least(greatest(coalesce(p_limit, 50), 1), 100);
end $$;
comment on function public.get_user_usage(uuid, timestamptz, int) is
  'Privacy: only for the admin (NOT_ADMIN otherwise); one user''s logins and sessions (time, minutes, platform, version), newest first, max 100.';

-- ---------------------------------------------------------------- retention job

create or replace function private.purge_usage_events() returns void
language sql security definer set search_path = public as $$
  update public.usage_events set ended_at = last_seen_at
   where kind = 'session' and ended_at is null and last_seen_at < now() - interval '10 minutes';
  delete from public.usage_events where started_at < now() - interval '90 days';
$$;
revoke all on function private.purge_usage_events() from public, anon, authenticated;
select cron.schedule('purge-usage-events', '45 6 * * *', 'select private.purge_usage_events()');

-- ---------------------------------------------------------------- account deletion (latest definition + usage_events)

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := private.require_user();
begin
  -- photos cannot be deleted with SQL on Supabase: queue them for the storage cleaner
  insert into private.storage_deletion_queue (bucket_id, object_path)
  select 'posts', photo_path from public.posts where user_id = v_me and photo_path is not null
  union all
  select 'chat-photos', photo_path from public.chat_messages where user_id = v_me and photo_path is not null
  union all
  select 'feedback', screenshot_path from public.feedback where user_id = v_me and screenshot_path is not null
  union all
  select 'avatars', avatar_path from public.profiles where id = v_me and avatar_path is not null;

  delete from public.usage_events where user_id = v_me;
  delete from public.feedback where user_id = v_me;
  delete from public.posts where user_id = v_me;
  delete from public.post_comments where user_id = v_me;
  delete from public.post_likes where user_id = v_me;
  delete from public.chat_messages where user_id = v_me;
  delete from public.declarations where user_id = v_me;
  delete from public.follows where follower_id = v_me or followee_id = v_me;
  delete from public.blocks where blocker_id = v_me or blocked_id = v_me;
  delete from public.search_history where user_id = v_me;
  delete from public.push_tokens where user_id = v_me;
  delete from public.phone_hashes where user_id = v_me;
  delete from public.contact_hashes_tmp where user_id = v_me;
  delete from public.events where creator_id = v_me;

  update public.profiles
     set deleted_at = now(), birth_date = null, gender = null, city_id = null, is_creator = false,
         location_opt_in = false, contacts_opt_in = false, avatar_path = null
   where id = v_me;

  -- an Edge Function with the service role deletes auth.users (cascading the profile) within 24 h
  insert into private.account_deletion_requests (user_id) values (v_me) on conflict do nothing;
end $$;
comment on function public.delete_my_account() is
  'Privacy: erases the caller''s content, usage log, relations and personal fields at once; the auth account is removed within 24 h.';

-- ---------------------------------------------------------------- privileges

revoke all on function private.require_admin(), private.usage_platform(text)
  from public, anon, authenticated;
revoke all on function public.log_login(text, text), public.start_usage_session(text, text),
  public.touch_usage_session(bigint), public.end_usage_session(bigint),
  public.get_usage_overview(int, text), public.get_user_usage(uuid, timestamptz, int) from public, anon;
grant execute on function public.log_login(text, text), public.start_usage_session(text, text),
  public.touch_usage_session(bigint), public.end_usage_session(bigint),
  public.get_usage_overview(int, text), public.get_user_usage(uuid, timestamptz, int) to authenticated, service_role;
