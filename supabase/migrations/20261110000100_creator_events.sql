-- 0021 — Creator events (prompt 12): RPC-only writes, validation, soft delete, k-anonymous attendance.
-- Principles 1, 2, 6, 9: the creator sees sign-ups as bands and aggregates only, never as people.

-- ---------------------------------------------------------------- writes only through RPCs

-- A direct insert/update/delete skipped every rule below (limit of 10, end by 06:00, active venue).
drop policy if exists events_insert on public.events;
drop policy if exists events_update on public.events;
drop policy if exists events_delete on public.events;
revoke insert, update, delete on public.events from authenticated;

-- Cancelling keeps the row: declarations stay (expired) so prompt 15 can notify the people who had declared.
alter table public.events add column cancelled_at timestamptz;

-- ---------------------------------------------------------------- validation helpers

create or replace function private.validate_event_input(
  p_venue_id uuid, p_name text, p_description text, p_starts_at timestamptz, p_ends_at timestamptz,
  p_target_age_bands text[], p_target_genders text[]
) returns void
language plpgsql stable security definer set search_path = public as $$
declare
  v_city uuid;
  v_timezone text;
begin
  if char_length(btrim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception 'INVALID_NAME' using errcode = 'P0001';
  end if;
  if char_length(coalesce(p_description, '')) > 500 then
    raise exception 'INVALID_DESCRIPTION' using errcode = 'P0001';
  end if;
  if not (coalesce(p_target_age_bands, '{}') <@ array['18-24', '25-34', '35-44', '45+'])
     or not (coalesce(p_target_genders, '{}') <@ array['female', 'male', 'other']) then
    raise exception 'INVALID_TARGET' using errcode = 'P0001';
  end if;
  select v.city_id, c.timezone into v_city, v_timezone
    from public.venues v join public.cities c on c.id = v.city_id
   where v.id = p_venue_id and v.is_active and c.is_active;
  if v_city is null then
    raise exception 'VENUE_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  -- the night ends at 06:00 local time: an event may not outlive the night it starts in
  if p_starts_at is null or p_ends_at is null or p_starts_at <= now() or p_starts_at > now() + interval '60 days'
     or p_ends_at <= p_starts_at
     or p_ends_at > public.night_end(public.night_date_at(v_city, p_starts_at), v_timezone) then
    raise exception 'INVALID_SCHEDULE' using errcode = 'P0001';
  end if;
end $$;

create or replace function private.active_event_declarations(p_event_id uuid)
returns table (user_id uuid, intent text)
language sql stable security definer set search_path = public as $$
  select d.user_id, d.intent
    from public.declarations d join public.profiles p on p.id = d.user_id and p.deleted_at is null
   where d.event_id = p_event_id and d.expires_at > now()
$$;

-- ---------------------------------------------------------------- create / update / cancel

create or replace function public.create_event(
  p_venue_id uuid, p_name text, p_description text, p_starts_at timestamptz, p_ends_at timestamptz,
  p_target_age_bands text[] default '{}', p_target_genders text[] default '{}'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_id uuid;
begin
  -- the profile row lock serialises concurrent calls so the limit of 10 cannot be raced
  if not (select is_creator from public.profiles where id = v_me for update) then
    raise exception 'NOT_CREATOR' using errcode = 'P0001';
  end if;
  perform private.validate_event_input(p_venue_id, p_name, p_description, p_starts_at, p_ends_at,
                                       p_target_age_bands, p_target_genders);
  if (select count(*) from public.events where creator_id = v_me and ends_at > now() and cancelled_at is null) >= 10 then
    raise exception 'TOO_MANY_ACTIVE_EVENTS' using errcode = 'P0001';
  end if;
  insert into public.events (creator_id, venue_id, name, description, starts_at, ends_at, target_age_bands, target_genders)
  values (v_me, p_venue_id, btrim(p_name), nullif(btrim(p_description), ''), p_starts_at, p_ends_at,
          coalesce(p_target_age_bands, '{}'), coalesce(p_target_genders, '{}'))
  returning id into v_id;
  return v_id;
end $$;
comment on function public.create_event(uuid, text, text, timestamptz, timestamptz, text[], text[]) is
  'Privacy: creators publish events (max 10 active, ending by 06:00 local); sponsorship is set by billing only, never by this call; the only write path to events.';

create or replace function public.update_event(
  p_event_id uuid, p_name text, p_description text, p_starts_at timestamptz, p_ends_at timestamptz,
  p_target_age_bands text[] default '{}', p_target_genders text[] default '{}'
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_event public.events;
begin
  select * into v_event from public.events where id = p_event_id and creator_id = v_me for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_event.cancelled_at is not null then
    raise exception 'EVENT_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  if v_event.starts_at <= now() then
    raise exception 'EVENT_STARTED' using errcode = 'P0001';
  end if;
  perform private.validate_event_input(v_event.venue_id, p_name, p_description, p_starts_at, p_ends_at,
                                       p_target_age_bands, p_target_genders);
  update public.events
     set name = btrim(p_name), description = nullif(btrim(p_description), ''), starts_at = p_starts_at, ends_at = p_ends_at,
         target_age_bands = coalesce(p_target_age_bands, '{}'), target_genders = coalesce(p_target_genders, '{}')
   where id = p_event_id;
  -- declarations and chat follow the event's new end (principle 5: the TTL is computed by the server)
  update public.declarations set expires_at = p_ends_at where event_id = p_event_id;
  update public.chat_rooms set expires_at = p_ends_at + interval '2 days' where event_id = p_event_id;
end $$;
comment on function public.update_event(uuid, text, text, timestamptz, timestamptz, text[], text[]) is
  'Privacy: only the creator, only before the start; the venue never changes; declarations and chat expiry follow the new end.';

create or replace function public.cancel_event(p_event_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_event public.events;
begin
  select * into v_event from public.events where id = p_event_id and creator_id = v_me for update;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_event.cancelled_at is not null then
    return;
  end if;
  if v_event.ends_at <= now() then
    raise exception 'EVENT_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  update public.events set cancelled_at = now() where id = p_event_id;
  -- rows are kept (prompt 15 will notify who had declared) but expire at once, so nothing shows them;
  -- the room expires too and the purge job deletes it together with its photos
  update public.declarations set expires_at = now() where event_id = p_event_id and expires_at > now();
  update public.chat_rooms set expires_at = now() where event_id = p_event_id and expires_at > now();
end $$;
comment on function public.cancel_event(uuid) is
  'Privacy: only the creator; soft delete that expires the event''s declarations and chat immediately.';

-- ---------------------------------------------------------------- declare / post target ignore cancelled events

create or replace function public.declare(p_intent text, p_venue_id uuid default null, p_event_id uuid default null)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_night uuid;
  v_id uuid;
begin
  if p_intent not in ('going', 'maybe') then
    raise exception 'INVALID_INTENT' using errcode = 'P0001';
  end if;
  if num_nonnulls(p_venue_id, p_event_id) <> 1 then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  if p_venue_id is not null then
    if not exists (select 1 from public.venues v join public.cities c on c.id = v.city_id
                    where v.id = p_venue_id and v.is_active and c.is_active) then
      raise exception 'VENUE_NOT_ACTIVE' using errcode = 'P0001';
    end if;
    v_night := private.ensure_night(p_venue_id,
      public.current_night_date((select city_id from public.venues where id = p_venue_id)));
  elsif not exists (select 1 from public.events e join public.venues v on v.id = e.venue_id
                     where e.id = p_event_id and e.ends_at > now() and e.cancelled_at is null and v.is_active) then
    raise exception 'EVENT_NOT_ACTIVE' using errcode = 'P0001';
  end if;

  -- one plan per night: a new declaration replaces any other active one
  delete from public.declarations
   where user_id = v_me and expires_at > now()
     and not (night_id is not distinct from v_night and event_id is not distinct from p_event_id);

  if v_night is not null then
    insert into public.declarations (user_id, night_id, intent) values (v_me, v_night, p_intent)
    on conflict (user_id, night_id) do update set intent = excluded.intent
    returning id into v_id;
  else
    insert into public.declarations (user_id, event_id, intent) values (v_me, p_event_id, p_intent)
    on conflict (user_id, event_id) do update set intent = excluded.intent
    returning id into v_id;
  end if;
  return v_id;
end $$;
comment on function public.declare(text, uuid, uuid) is
  'Privacy: records the caller''s plan; others only ever see it as a k≥3 band or, if they are accepted followers, by handle.';

create or replace function public.get_post_target()
returns table (night_id uuid, event_id uuid, venue_name text, night_date date, room_id uuid)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_me uuid := private.require_user();
begin
  return query
  select d.night_id, d.event_id, v.name, coalesce(n.night_date, public.night_date_at(v.city_id, e.starts_at)),
         (select r.id from public.chat_rooms r
           where (r.night_id = d.night_id or r.event_id = d.event_id) and private.is_room_member(r.id, v_me)
           limit 1)
    from public.declarations d
    left join public.nights n on n.id = d.night_id
    left join public.events e on e.id = d.event_id
    join public.venues v on v.id = coalesce(n.venue_id, e.venue_id)
   where d.user_id = v_me and d.expires_at > now() - interval '24 hours' and e.cancelled_at is null
   order by d.expires_at desc, d.created_at desc
   limit 1;
end $$;
comment on function public.get_post_target() is
  'Privacy: the caller''s own most recent declaration, active or expired for less than 24 hours (the canPost rule), never on a cancelled event; room_id only while the chat is alive and the caller is a member.';

-- Declarations of a cancelled event never attended anything: keep them out of the typical-layer history.
create or replace function private.snapshot_night_attendance() returns void
language sql security definer set search_path = public as $$
  insert into private.night_attendance (venue_id, night_date, declared)
  select venue_id, night_date, count(*)::int from (
    select n.venue_id, n.night_date
      from public.declarations d join public.nights n on n.id = d.night_id
     where d.expires_at < now()
    union all
    select e.venue_id, public.night_date_at(v.city_id, e.starts_at)
      from public.declarations d join public.events e on e.id = d.event_id join public.venues v on v.id = e.venue_id
     where d.expires_at < now() and e.cancelled_at is null
  ) expired
   group by venue_id, night_date
  on conflict (venue_id, night_date) do update set declared = greatest(private.night_attendance.declared, excluded.declared)
$$;

-- ---------------------------------------------------------------- creator reads

drop function if exists public.get_my_creator_events();
create or replace function public.get_my_creator_events(p_scope text default 'upcoming')
returns table (
  event_id uuid, name text, description text, venue_id uuid, venue_name text, venue_kind text,
  starts_at timestamptz, ends_at timestamptz, cancelled_at timestamptz, going_band text, maybe_band text,
  target_age_bands text[], target_genders text[], is_sponsored boolean, can_edit boolean, timezone text
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_me uuid := private.require_user();
begin
  if p_scope not in ('upcoming', 'past') then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  return query
  select e.id, e.name, e.description, v.id, v.name, v.kind, e.starts_at, e.ends_at, e.cancelled_at,
         public.attendance_band(c.going), public.attendance_band(c.maybe),
         e.target_age_bands, e.target_genders, e.is_sponsored,
         e.cancelled_at is null and e.starts_at > now(), ci.timezone
    from public.events e
    join public.venues v on v.id = e.venue_id
    join public.cities ci on ci.id = v.city_id
    cross join lateral private.event_counts(e.id) c
   where e.creator_id = v_me
     and ((p_scope = 'upcoming') = (e.ends_at > now() and e.cancelled_at is null))
   order by case when p_scope = 'upcoming' then e.starts_at end asc, e.starts_at desc;
end $$;
comment on function public.get_my_creator_events(text) is
  'Privacy: the creator sees sign-ups to their own events as bands (k ≥ 3), never as people.';

drop function if exists public.get_event_attendance(uuid);
create or replace function public.get_event_attendance(p_event_id uuid)
returns table (going_band text, maybe_band text, avg_age numeric, female_pct int, male_pct int, other_pct int)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_me uuid := private.require_user();
begin
  if not exists (select 1 from public.events where id = p_event_id and creator_id = v_me) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return query
  with sign_ups as (
    -- also expired ones: past events keep their history until the 7-day cleanup
    select d.intent, p.birth_date, p.gender
      from public.declarations d join public.profiles p on p.id = d.user_id and p.deleted_at is null
     where d.event_id = p_event_id
  ),
  agg as (
    select count(*)::int as n,
           count(*) filter (where intent = 'going')::int as n_going,
           count(*) filter (where intent = 'maybe')::int as n_maybe,
           avg(extract(year from age(current_date, birth_date))) as avg_age,
           count(*) filter (where gender = 'female')::numeric as f,
           count(*) filter (where gender = 'male')::numeric as m,
           count(*) filter (where gender = 'other')::numeric as o
      from sign_ups
  )
  -- same k rule as get_venue_stats: no statistic under 3 people, nor when going or maybe alone is 1 or 2
  select public.attendance_band(a.n_going), public.attendance_band(a.n_maybe),
         case when a.k_ok then round(a.avg_age) end,
         case when a.k_ok then round(100 * a.f / a.n)::int end,
         case when a.k_ok then round(100 * a.m / a.n)::int end,
         case when a.k_ok then round(100 * a.o / a.n)::int end
    from (select agg.*, agg.n >= 3 and agg.n_going not in (1, 2) and agg.n_maybe not in (1, 2) as k_ok from agg) a;
end $$;
comment on function public.get_event_attendance(uuid) is
  'Privacy: only the event creator; bands plus average age and gender split only when the group (and each of going/maybe) has at least 3 people; never a list of people.';

-- ---------------------------------------------------------------- discovery for everybody

create or replace function public.get_city_events(p_city_slug text, p_query text default null, p_days int default 7)
returns table (
  event_id uuid, name text, venue_id uuid, venue_name text, venue_kind text, lat double precision, lng double precision,
  starts_at timestamptz, ends_at timestamptz, going_band text, maybe_band text, is_sponsored boolean, timezone text
)
language plpgsql stable security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare
  v_city uuid;
  v_query text := nullif(btrim(p_query), '');
begin
  perform private.require_user();
  v_city := private.active_city(p_city_slug);
  return query
  select e.id, e.name, v.id, v.name, v.kind, st_y(v.location::geometry), st_x(v.location::geometry),
         e.starts_at, e.ends_at, public.attendance_band(c.going), public.attendance_band(c.maybe),
         e.is_sponsored and (e.sponsored_until is null or e.sponsored_until > now()), ci.timezone
    from public.events e
    join public.venues v on v.id = e.venue_id
    join public.cities ci on ci.id = v.city_id
    cross join lateral (
      select count(*) filter (where a.intent = 'going')::int as going, count(*) filter (where a.intent = 'maybe')::int as maybe
        from private.active_event_declarations(e.id) a
    ) c
   where v.city_id = v_city and v.is_active and e.cancelled_at is null and e.ends_at > now()
     and e.starts_at < now() + make_interval(days => least(greatest(coalesce(p_days, 7), 1), 14))
     and (v_query is null
          or e.name ilike '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%'
          or v.name ilike '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%')
   order by e.starts_at, e.name
   limit 100;
end $$;
comment on function public.get_city_events(text, text, int) is
  'Privacy: upcoming events of an active city with turnout bands only (k ≥ 3); no per-user data.';

create or replace function public.get_event_detail(p_event_id uuid)
returns table (
  event_id uuid, name text, description text, starts_at timestamptz, ends_at timestamptz, cancelled_at timestamptz,
  target_age_bands text[], target_genders text[], venue_id uuid, venue_name text, venue_kind text, address text,
  lat double precision, lng double precision, city_slug text, timezone text, taxi_number text,
  going_band text, maybe_band text, avg_age numeric, female_pct int, male_pct int, other_pct int,
  friends jsonb, is_mine boolean, creator_handle text
)
language plpgsql stable security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare v_me uuid := private.require_user();
begin
  if not exists (select 1 from public.events e join public.venues v on v.id = e.venue_id join public.cities c on c.id = v.city_id
                  where e.id = p_event_id and v.is_active and c.is_active) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return query
  with sign_ups as (
    select a.user_id, a.intent, p.handle, p.birth_date, p.gender
      from private.active_event_declarations(p_event_id) a join public.profiles p on p.id = a.user_id
  ),
  agg as (
    select count(*)::int as n,
           count(*) filter (where intent = 'going')::int as n_going,
           count(*) filter (where intent = 'maybe')::int as n_maybe,
           avg(extract(year from age(current_date, birth_date))) as avg_age,
           count(*) filter (where gender = 'female')::numeric as f,
           count(*) filter (where gender = 'male')::numeric as m,
           count(*) filter (where gender = 'other')::numeric as o
      from sign_ups
  ),
  stats as (
    -- same k rule as get_venue_stats
    select agg.*, agg.n >= 3 and agg.n_going not in (1, 2) and agg.n_maybe not in (1, 2) as k_ok from agg
  )
  select e.id, e.name, e.description, e.starts_at, e.ends_at, e.cancelled_at, e.target_age_bands, e.target_genders,
         v.id, v.name, v.kind, v.address, st_y(v.location::geometry), st_x(v.location::geometry),
         ci.slug, ci.timezone, ci.taxi_phone,
         public.attendance_band(s.n_going), public.attendance_band(s.n_maybe),
         case when s.k_ok then round(s.avg_age) end,
         case when s.k_ok then round(100 * s.f / s.n)::int end,
         case when s.k_ok then round(100 * s.m / s.n)::int end,
         case when s.k_ok then round(100 * s.o / s.n)::int end,
         coalesce((
           select jsonb_agg(jsonb_build_object('handle', t.handle, 'age_band', public.age_band(t.birth_date),
                                               'gender', t.gender, 'intent', t.intent) order by t.handle)
             from sign_ups t
            where private.is_following(v_me, t.user_id) and not private.is_blocked_pair(v_me, t.user_id)
         ), '[]'::jsonb),
         e.creator_id = v_me, cp.handle
    from public.events e
    join public.venues v on v.id = e.venue_id
    join public.cities ci on ci.id = v.city_id
    join public.profiles cp on cp.id = e.creator_id
    cross join stats s
   where e.id = p_event_id;
end $$;
comment on function public.get_event_detail(uuid) is
  'Privacy: bands, average age and gender split only with k ≥ 3 (same rule as get_venue_stats); friends lists accepted follows only (handle/age band/gender/intent); the creator handle is public.';

-- ---------------------------------------------------------------- privileges (same rule as 0011)

revoke all on function
  private.validate_event_input(uuid, text, text, timestamptz, timestamptz, text[], text[]),
  private.active_event_declarations(uuid)
  from public, anon, authenticated;
revoke all on function
  public.create_event(uuid, text, text, timestamptz, timestamptz, text[], text[]),
  public.update_event(uuid, text, text, timestamptz, timestamptz, text[], text[]),
  public.cancel_event(uuid), public.get_my_creator_events(text), public.get_event_attendance(uuid),
  public.get_city_events(text, text, int), public.get_event_detail(uuid)
  from public, anon;
grant execute on function
  public.create_event(uuid, text, text, timestamptz, timestamptz, text[], text[]),
  public.update_event(uuid, text, text, timestamptz, timestamptz, text[], text[]),
  public.cancel_event(uuid), public.get_my_creator_events(text), public.get_event_attendance(uuid),
  public.get_city_events(text, text, int), public.get_event_detail(uuid)
  to authenticated, service_role;
