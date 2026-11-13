-- 0026 — Prompt 20: Google-style search and declarable spots.
-- A spot is a `venues` row with kind = 'spot': either a place a user named on the map (source = 'user', born with the
-- first declaration, gone at 06:00) or an address picked from Google search (source = 'places', Places 30-day rules).
-- Principles: 2 (k-anonymity: below 3 a spot shows no number, not even "pochi"), 1 (created_by never leaves the
-- database), 7 (the name is UGC: three distinct reports hide it).

-- ---------------------------------------------------------------- columns and constraints
alter table public.venues drop constraint if exists venues_kind_check;
alter table public.venues add constraint venues_kind_check
  check (kind in ('club', 'rooftop', 'bar', 'live', 'other', 'spot'));

alter table public.venues
  add column source text not null default 'places' check (source in ('places', 'user')),
  add column created_by uuid references public.profiles (id) on delete set null,
  add column spot_expires_at timestamptz,
  add column hidden_at timestamptz;
alter table public.venues
  add constraint venues_user_source_is_spot check (source <> 'user' or kind = 'spot'),
  add constraint venues_created_by_is_user check (created_by is null or source = 'user');
comment on column public.venues.created_by is
  'Author of a user spot. Never readable by clients (no column grant) and never returned by any RPC (principle 1).';
comment on column public.venues.hidden_at is 'Set by moderation (3 distinct reports); hidden spots leave map, search and declarations.';
create index venues_spot_author_idx on public.venues (created_by, spot_expires_at) where source = 'user';

-- Clients may read the catalog, not the author or the moderation flag, and never a user spot directly: spots reach
-- them only through RPCs that apply k-anonymity. `select *` on venues is therefore denied on purpose.
revoke select on public.venues from authenticated;
grant select (id, city_id, google_place_id, name, kind, location, address, opening_hours, is_active,
              places_synced_at, created_at, updated_at, source, spot_expires_at)
  on public.venues to authenticated;
drop policy venues_read on public.venues;
create policy venues_read on public.venues for select to authenticated using (kind <> 'spot');

-- ---------------------------------------------------------------- helpers
create or replace function private.spot_is_visible(p_kind text, p_hidden_at timestamptz, p_expires_at timestamptz)
returns boolean language sql stable as $$
  select p_kind <> 'spot' or (p_hidden_at is null and (p_expires_at is null or p_expires_at > now()))
$$;

-- The active city whose centre is within its Places radius of the point (nearest wins); null when none.
create or replace function private.city_for_point(p_lat double precision, p_lng double precision) returns uuid
language sql stable security definer set search_path = public, extensions as $$
  select c.id
    from public.cities c
   where c.is_active and p_lat between -90 and 90 and p_lng between -180 and 180
     and st_dwithin(c.center, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, c.places_radius_m)
   order by st_distance(c.center, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
   limit 1
$$;

-- Name rules, mirrored by the client (src/features/spots/domain/spotName.ts): 3-40 characters, no @, no links.
create or replace function private.is_valid_spot_name(p_name text) returns boolean
language sql immutable as $$
  select p_name is not null
     and char_length(p_name) between 3 and 40
     and position('@' in p_name) = 0
     and p_name !~* 'https?://|www\.|\.[a-z]{2,}(/|$)'
$$;

-- ---------------------------------------------------------------- hidden spots leave every aggregate
create or replace function private.tonight_declarations(p_city_id uuid)
returns table (venue_id uuid, user_id uuid, intent text)
language sql stable security definer set search_path = public as $$
  with night as (
    select public.current_night_date(c.id) as night_date,
           public.night_end(public.current_night_date(c.id), c.timezone) as ends_at
      from public.cities c where c.id = p_city_id
  )
  select n.venue_id, d.user_id, d.intent
    from public.declarations d
    join public.nights n on n.id = d.night_id
    join public.venues v on v.id = n.venue_id
    join public.profiles p on p.id = d.user_id and p.deleted_at is null
   where v.city_id = p_city_id and n.night_date = (select night_date from night) and d.expires_at > now()
     and private.spot_is_visible(v.kind, v.hidden_at, v.spot_expires_at)
  union all
  select e.venue_id, d.user_id, d.intent
    from public.declarations d
    join public.events e on e.id = d.event_id
    join public.venues v on v.id = e.venue_id
    join public.profiles p on p.id = d.user_id and p.deleted_at is null
   where v.city_id = p_city_id and d.expires_at > now() and e.starts_at < (select ends_at from night)
$$;

create or replace function private.user_tonight_venue(p_user_id uuid)
returns table (venue_id uuid, venue_name text)
language sql stable security definer set search_path = public as $$
  select v.id, v.name
    from public.declarations d
    left join public.nights n on n.id = d.night_id
    left join public.events e on e.id = d.event_id
    join public.venues v on v.id = coalesce(n.venue_id, e.venue_id)
   where d.user_id = p_user_id and d.expires_at > now()
     and private.spot_is_visible(v.kind, v.hidden_at, v.spot_expires_at)
   order by d.updated_at desc
   limit 1
$$;

-- Spots are not catalog entries: the catalog search never returns them.
create or replace function private.venue_search_rows(p_city_id uuid, p_kind text, p_query text)
returns table (venue_id uuid, name text, kind text, address text, going int, maybe int, is_sponsored boolean)
language sql stable security definer set search_path = public as $$
  select v.id, v.name, v.kind, v.address,
         count(t.user_id) filter (where t.intent = 'going')::int,
         count(t.user_id) filter (where t.intent = 'maybe')::int,
         private.venue_is_sponsored(v.id)
    from public.venues v
    left join private.tonight_declarations(p_city_id) t on t.venue_id = v.id
   where v.city_id = p_city_id and v.is_active and v.kind <> 'spot'
     and (p_kind is null or v.kind = p_kind)
     and (p_query is null or v.name ilike '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%')
   group by v.id
$$;

create or replace function public.get_recommended_venue(p_city_slug text)
returns table (venue_id uuid, name text, kind text, reason text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_me uuid := private.require_user();
  v_city uuid := private.active_city(p_city_slug);
begin
  return query
  select v.id, v.name, v.kind, 'history'::text
    from public.search_history h join public.venues v on v.id = h.venue_id
   where h.user_id = v_me and v.city_id = v_city and v.is_active and v.kind <> 'spot'
   order by h.searched_at desc limit 1;
  if found then return; end if;

  return query
  select v.id, v.name, v.kind, 'hot'::text
    from private.tonight_declarations(v_city) t join public.venues v on v.id = t.venue_id
   where v.is_active
   group by v.id
  having count(*) >= 3
   order by count(*) desc limit 1;
end $$;
comment on function public.get_recommended_venue(text) is
  'Privacy: based only on the caller''s own search history, or on the busiest venue with at least 3 declarations.';

-- ---------------------------------------------------------------- declare: hidden / expired spots are closed
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
                    where v.id = p_venue_id and v.is_active and c.is_active
                      and private.spot_is_visible(v.kind, v.hidden_at, v.spot_expires_at)) then
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

-- ---------------------------------------------------------------- map: spots as declarable, numbers only from k = 3
drop function public.get_city_map(text, text);
create function public.get_city_map(p_city_slug text, p_view text default 'general')
returns table (
  venue_id uuid, name text, kind text, lat double precision, lng double precision,
  typical_level smallint, going_band text, maybe_band text, is_hot_spot boolean, is_sponsored boolean,
  friends_going text[], friends_count int, is_spot boolean, is_declarable boolean
)
language plpgsql stable security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare
  v_me uuid := private.require_user();
  v_city uuid;
begin
  if p_view not in ('general', 'friends') then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  v_city := private.active_city(p_city_slug);
  return query
  with tonight as (select * from private.tonight_declarations(v_city)),
  counts as (
    select t.venue_id, count(*) filter (where t.intent = 'going')::int as going,
           count(*) filter (where t.intent = 'maybe')::int as maybe
      from tonight t group by t.venue_id
  ),
  friends as (
    select t.venue_id, array_agg(p.handle order by p.handle) as handles, count(*)::int as n
      from tonight t join public.profiles p on p.id = t.user_id
     where private.is_following(v_me, t.user_id) and not private.is_blocked_pair(v_me, t.user_id)
     group by t.venue_id
  ),
  base as (
    select v.id, v.name, v.kind, st_y(v.location::geometry) as lat, st_x(v.location::geometry) as lng,
           v.kind = 'spot' as spot,
           case when v.kind = 'spot' then 0::smallint else public.typical_level(v.id, now()) end as typical,
           coalesce(c.going, 0) as going, coalesce(c.maybe, 0) as maybe,
           f.handles, f.n, private.venue_is_sponsored(v.id) as sponsored
      from public.venues v
      left join counts c on c.venue_id = v.id
      left join friends f on f.venue_id = v.id
     where v.city_id = v_city and v.is_active
       and private.spot_is_visible(v.kind, v.hidden_at, v.spot_expires_at)
  )
  select b.id, b.name, b.kind, b.lat, b.lng, b.typical,
         -- a spot below k = 3 shows no number at all, not even "pochi": its mere existence is the signal
         case when b.spot and b.going + b.maybe < 3 then null else public.attendance_band(b.going) end,
         case when b.spot and b.going + b.maybe < 3 then null else public.attendance_band(b.maybe) end,
         (b.going + b.maybe) >= 3, b.sponsored,
         case when p_view = 'friends' then b.handles[1:5] end,
         case when p_view = 'friends' then b.n end,
         b.spot, b.spot
    from base b
   where case
           -- below k = 3 a venue is at most a grey "typical dot" (principle 11), never a hot spot;
           -- a spot exists on the map only while someone has declared it
           when p_view = 'general' and b.spot then (b.going + b.maybe) >= 1
           when p_view = 'general' then (b.going + b.maybe) >= 3 or b.typical >= 1 or b.sponsored
           else coalesce(b.n, 0) > 0
         end;
end $$;
comment on function public.get_city_map(text, text) is
  'Privacy: turnout only as bands; venues with fewer than 3 declarations are never hot spots; a spot below 3 has NULL bands; '
  'friends view lists handles of accepted follows only; never returns the author of a spot (principles 1, 2, 6, 11).';
revoke all on function public.get_city_map(text, text) from public, anon;
grant execute on function public.get_city_map(text, text) to authenticated, service_role;

-- ---------------------------------------------------------------- venue stats and detail: same k rule, hidden spots closed
create or replace function public.get_venue_stats(p_venue_id uuid, p_segment text default 'all')
returns table (
  going_band text, maybe_band text, avg_age numeric, female_pct int, male_pct int, other_pct int,
  friends jsonb, is_sponsored boolean
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_me uuid := private.require_user();
  v_city uuid;
  v_kind text;
begin
  if p_segment not in ('going', 'maybe', 'all') then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  select city_id, kind into v_city, v_kind from public.venues
   where id = p_venue_id and is_active and private.spot_is_visible(kind, hidden_at, spot_expires_at);
  if v_city is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return query
  with tonight as (
    select t.user_id, t.intent, p.handle, p.birth_date, p.gender
      from private.tonight_declarations(v_city) t join public.profiles p on p.id = t.user_id
     where t.venue_id = p_venue_id
  ),
  seg as (select * from tonight where p_segment = 'all' or intent = p_segment),
  agg as (
    select count(*)::int as n,
           count(*) filter (where intent = 'going')::int as n_going,
           count(*) filter (where intent = 'maybe')::int as n_maybe,
           avg(extract(year from age(current_date, birth_date))) as avg_age,
           count(*) filter (where gender = 'female')::numeric as f,
           count(*) filter (where gender = 'male')::numeric as m,
           count(*) filter (where gender = 'other')::numeric as o
      from seg
  )
  select case when v_kind = 'spot' and (select count(*) from tonight) < 3 then null
              else public.attendance_band((select count(*)::int from tonight where intent = 'going')) end,
         case when v_kind = 'spot' and (select count(*) from tonight) < 3 then null
              else public.attendance_band((select count(*)::int from tonight where intent = 'maybe')) end,
         -- k-anonymity (principle 2): no statistic about a group smaller than 3, and in "all" every
         -- non-empty sub-group must reach 3 too, otherwise "all" minus "going" would expose the rest
         case when a.k_ok then round(a.avg_age) end,
         case when a.k_ok then round(100 * a.f / a.n)::int end,
         case when a.k_ok then round(100 * a.m / a.n)::int end,
         case when a.k_ok then round(100 * a.o / a.n)::int end,
         coalesce((
           select jsonb_agg(jsonb_build_object('handle', t.handle, 'age_band', public.age_band(t.birth_date),
                                               'gender', t.gender, 'intent', t.intent) order by t.handle)
             from tonight t
            where private.is_following(v_me, t.user_id) and not private.is_blocked_pair(v_me, t.user_id)
         ), '[]'::jsonb),
         private.venue_is_sponsored(p_venue_id)
    from (select agg.*, agg.n >= 3 and agg.n_going not in (1, 2) and agg.n_maybe not in (1, 2) as k_ok from agg) a;
end $$;
comment on function public.get_venue_stats(uuid, text) is
  'Privacy: bands only (NULL for a spot below 3 people); average age and gender split are NULL when the segment (or any non-empty sub-group of "all") has fewer than 3 people; '
  'friends lists handle/age band/gender/intent of accepted follows only.';

create or replace function public.get_venue_detail(p_venue_id uuid)
returns table (
  venue_id uuid, name text, kind text, address text, opening_hours jsonb, google_place_id text,
  lat double precision, lng double precision,
  city_slug text, city_name text, country text, timezone text, taxi_number text
)
language plpgsql stable security definer set search_path = public, extensions as $$
#variable_conflict use_column
begin
  perform private.require_user();
  return query
  select v.id, v.name, v.kind, v.address, v.opening_hours, v.google_place_id,
         st_y(v.location::geometry), st_x(v.location::geometry),
         c.slug, c.name, c.country, c.timezone, c.taxi_phone
    from public.venues v
    join public.cities c on c.id = v.city_id
   where v.id = p_venue_id and v.is_active and c.is_active
     and private.spot_is_visible(v.kind, v.hidden_at, v.spot_expires_at);
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
end $$;
comment on function public.get_venue_detail(uuid) is
  'Privacy: catalog data only (venue, city, taxi number); nothing per-user; hidden or expired spots are NOT_FOUND.';

-- ---------------------------------------------------------------- declare at a point / at a cached place
create or replace function public.declare_at_spot(
  p_lat double precision, p_lng double precision, p_name text, p_intent text
) returns table (venue_id uuid, declaration_id uuid)
language plpgsql security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare
  v_me uuid := private.require_user();
  v_name text := btrim(p_name);
  v_lat double precision;
  v_lng double precision;
  v_city uuid;
  v_venue uuid;
begin
  if p_intent not in ('going', 'maybe') then
    raise exception 'INVALID_INTENT' using errcode = 'P0001';
  end if;
  if p_lat is null or p_lng is null or p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  if not private.is_valid_spot_name(v_name) then
    raise exception 'INVALID_SPOT_NAME' using errcode = 'P0001';
  end if;
  -- ~10 m: the point is a place the user chose to publish, not their position (principle 3 does not apply)
  v_lat := round(p_lat::numeric, 4)::double precision;
  v_lng := round(p_lng::numeric, 4)::double precision;
  v_city := private.city_for_point(v_lat, v_lng);
  if v_city is null then
    raise exception 'OUT_OF_CITY' using errcode = 'P0001';
  end if;

  v_venue := private.reusable_own_spot(v_me, v_name, v_lat, v_lng);
  if v_venue is null then
    insert into public.venues (city_id, google_place_id, name, kind, source, created_by, spot_expires_at, location, is_active)
    values (v_city, 'spot:' || gen_random_uuid(), v_name, 'spot', 'user', v_me,
            public.night_end(public.current_night_date(v_city), (select timezone from public.cities where id = v_city)),
            st_setsrid(st_makepoint(v_lng, v_lat), 4326)::geography, true)
    returning id into v_venue;
  end if;
  -- same code path as every declaration: one plan per night, night row, chat room
  return query select v_venue, public.declare(p_intent, v_venue);
end $$;
comment on function public.declare_at_spot(double precision, double precision, text, text) is
  'Privacy: creates the caller''s one spot per night (point rounded to ~10 m, validated name) and declares it; '
  'the author is stored but never returned or readable; the spot shows no numbers below 3 declarations.';

-- The caller's live spot of this night: the same name and point re-uses it (change of mind), anything else
-- is SPOT_LIMIT. "Live" = not yet expired, which for a spot means the current night in its own city.
create or replace function private.reusable_own_spot(p_user uuid, p_name text, p_lat double precision, p_lng double precision)
returns uuid
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_id uuid;
  v_name text;
  v_loc geography;
begin
  select v.id, v.name, v.location into v_id, v_name, v_loc
    from public.venues v
   where v.created_by = p_user and v.source = 'user' and v.kind = 'spot' and v.spot_expires_at > now()
   limit 1;
  if v_id is null then
    return null;
  end if;
  if lower(v_name) = lower(p_name) and st_dwithin(v_loc, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, 1) then
    return v_id;
  end if;
  raise exception 'SPOT_LIMIT' using errcode = 'P0001';
end $$;

create or replace function public.declare_at_place(p_google_place_id text, p_intent text) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_venue uuid;
begin
  perform private.require_user();
  if p_intent not in ('going', 'maybe') then
    raise exception 'INVALID_INTENT' using errcode = 'P0001';
  end if;
  select v.id into v_venue
    from public.venues v join public.cities c on c.id = v.city_id
   where v.google_place_id = p_google_place_id and v.source = 'places' and v.is_active and c.is_active
     and private.spot_is_visible(v.kind, v.hidden_at, v.spot_expires_at);
  if v_venue is null then
    raise exception 'PLACE_NOT_CACHED' using errcode = 'P0001';
  end if;
  perform public.declare(p_intent, v_venue);
  return v_venue;
end $$;
comment on function public.declare_at_place(text, text) is
  'Privacy: declares at a venue already in our cache (created by places-detail after a search selection); never reaches Google.';

-- ---------------------------------------------------------------- service role: a search selection enters the cache
-- p_row: {google_place_id, name, kind, lat, lng, address?, types[]}. An establishment becomes a normal venue
-- (kind chosen by the Edge Function); anything else (street, premise, geocode…) becomes an address spot named after the
-- formatted address. Existing opening_hours are never touched: the Details Pro call does not carry them.
create or replace function public.upsert_search_place(p_city_slug text, p_row jsonb) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_city uuid;
  r record;
  v_business boolean;
  v_id uuid;
begin
  select id into v_city from public.cities where slug = p_city_slug;
  if v_city is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  select * into r from jsonb_to_record(p_row)
    as x(google_place_id text, name text, kind text, lat double precision, lng double precision, address text, types jsonb);
  if r.google_place_id is null or r.google_place_id ~ '^(spot|demo-)' or nullif(btrim(r.name), '') is null
     or r.lat is null or r.lng is null then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  if private.city_for_point(r.lat, r.lng) is distinct from v_city then
    raise exception 'OUT_OF_CITY' using errcode = 'P0001';
  end if;
  v_business := coalesce(r.types ?| array['establishment', 'point_of_interest'], false);

  insert into public.venues (city_id, google_place_id, name, kind, source, location, address, is_active, places_synced_at)
  values (v_city, r.google_place_id,
          left(case when v_business then r.name else coalesce(nullif(btrim(r.address), ''), r.name) end, 120),
          case when not v_business then 'spot'
               when r.kind in ('club', 'rooftop', 'bar', 'live') then r.kind else 'other' end,
          'places', st_setsrid(st_makepoint(r.lng, r.lat), 4326)::geography, r.address, true, now())
  on conflict (google_place_id) do update
    set name = excluded.name, kind = excluded.kind, location = excluded.location, address = excluded.address,
        is_active = true, places_synced_at = now()
  returning id into v_id;
  return v_id;
end $$;
comment on function public.upsert_search_place(text, jsonb) is
  'Privacy: service_role only (Edge Function places-detail); writes catalog data, no user data; never touches opening hours.';

-- ---------------------------------------------------------------- search quota (cost control, service role only)
-- A search session is identified by the sessionToken the client puts on its Autocomplete requests. The server counts
-- a session the first time it sees a token for that user, so a modified client cannot dodge the quota.
create table private.places_search_sessions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  session_token uuid not null,
  created_at timestamptz not null default now(),
  primary key (user_id, session_token)
);
comment on table private.places_search_sessions is
  'Autocomplete sessions per user (token + time), only to cap Google costs: no query text. Pruned after 2 days.';

-- One place for the limit: 30 distinct search sessions per user in the last 24 hours.
create or replace function private.places_search_daily_limit() returns int
language sql immutable as $$ select 30 $$;

create or replace function public.consume_places_search_session(p_user_id uuid, p_session_token uuid) returns boolean
language plpgsql security definer set search_path = public as $$
begin
  -- serialises concurrent first requests of the same user, so two new tokens cannot both slip under the limit
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  if exists (select 1 from private.places_search_sessions where user_id = p_user_id and session_token = p_session_token) then
    return true;
  end if;
  if (select count(*) from private.places_search_sessions
       where user_id = p_user_id and created_at > now() - interval '24 hours') >= private.places_search_daily_limit() then
    return false;
  end if;
  insert into private.places_search_sessions (user_id, session_token) values (p_user_id, p_session_token);
  return true;
end $$;
comment on function public.consume_places_search_session(uuid, uuid) is
  'Privacy: service_role only; counts distinct search sessions per user (max 30 in 24 h), a known token is free; stores no query text.';

create or replace function private.purge_places_search_usage() returns void
language sql security definer set search_path = public as $$
  delete from private.places_search_sessions where created_at < now() - interval '2 days'
$$;

-- ---------------------------------------------------------------- moderation: three distinct reporters hide a spot
alter table public.reports drop constraint if exists reports_target_kind_check;
alter table public.reports add constraint reports_target_kind_check
  check (target_kind in ('post', 'message', 'user', 'event', 'comment', 'spot'));

create or replace function public.report(p_target_kind text, p_target_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_target_kind not in ('post', 'message', 'user', 'event', 'comment', 'spot') or p_target_id is null then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  if p_target_kind = 'spot' and not exists (select 1 from public.venues where id = p_target_id and kind = 'spot') then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  insert into public.reports (reporter_id, target_kind, target_id, reason)
  values (private.require_user(), p_target_kind, p_target_id, left(p_reason, 500));
end $$;
comment on function public.report(text, uuid, text) is
  'Privacy: reports are readable only by moderators (service role), never by other users; a spot reported by 3 distinct users is hidden.';

-- Only unresolved reports count, so a moderator who restores a spot and resolves its reports starts from zero.
create or replace function private.hide_spot_when_reported() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.venues set hidden_at = now()
   where id = new.target_id and kind = 'spot' and hidden_at is null
     and (select count(distinct r.reporter_id) from public.reports r
           where r.target_kind = 'spot' and r.target_id = new.target_id and r.resolved_at is null) >= 3;
  return new;
end $$;
create trigger reports_hide_spot after insert on public.reports
  for each row when (new.target_kind = 'spot') execute function private.hide_spot_when_reported();

-- ---------------------------------------------------------------- lifecycle (principle 5)
-- A user spot disappears from the map at spot_expires_at (filter). The row is deleted only 2 days later AND once nothing
-- alive hangs from it (chat, posts, events): nights -> chat_rooms cascades, so deleting earlier would shorten the chat.
create or replace function private.purge_expired_spots() returns void
language sql security definer set search_path = public as $$
  delete from public.venues v
   where v.source = 'user' and v.kind = 'spot' and v.spot_expires_at < now() - interval '2 days'
     and not exists (select 1 from public.nights n join public.chat_rooms r on r.night_id = n.id
                      where n.venue_id = v.id and r.expires_at > now())
     and not exists (select 1 from public.nights n join public.posts p on p.night_id = n.id
                      where n.venue_id = v.id and p.expires_at > now())
     and not exists (select 1 from public.events e where e.venue_id = v.id)
$$;

-- Places terms: address spots expire like every cached place, user spots never go through this path.
create or replace function private.expire_stale_places() returns void
language sql security definer set search_path = public as $$
  update public.venues
     set is_active = false, location = null, address = null, opening_hours = null, name = google_place_id
   where source = 'places' and google_place_id not like 'demo-%'
     and places_synced_at < now() - interval '30 days'
     and (is_active or location is not null or address is not null or opening_hours is not null
          or name <> google_place_id)
$$;

select cron.schedule('purge-expired-spots', '*/10 * * * *', 'select private.purge_expired_spots()');
select cron.schedule('purge-places-search-usage', '15 4 * * *', 'select private.purge_places_search_usage()');

-- ---------------------------------------------------------------- privileges (same rule as 0011)
revoke all on function public.declare_at_spot(double precision, double precision, text, text) from public, anon;
grant execute on function public.declare_at_spot(double precision, double precision, text, text) to authenticated, service_role;
revoke all on function public.declare_at_place(text, text) from public, anon;
grant execute on function public.declare_at_place(text, text) to authenticated, service_role;
revoke all on function public.get_venue_stats(uuid, text), public.get_venue_detail(uuid),
  public.get_recommended_venue(text) from public, anon;
grant execute on function public.get_venue_stats(uuid, text), public.get_venue_detail(uuid),
  public.get_recommended_venue(text) to authenticated, service_role;

revoke all on function public.upsert_search_place(text, jsonb) from public, anon, authenticated;
grant execute on function public.upsert_search_place(text, jsonb) to service_role;
revoke all on function public.consume_places_search_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.consume_places_search_session(uuid, uuid) to service_role;

revoke all on function private.spot_is_visible(text, timestamptz, timestamptz), private.city_for_point(double precision, double precision),
  private.is_valid_spot_name(text), private.reusable_own_spot(uuid, text, double precision, double precision),
  private.places_search_daily_limit(), private.purge_places_search_usage(), private.purge_expired_spots(),
  private.hide_spot_when_reported() from public, anon, authenticated;
