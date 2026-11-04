-- 0014 — Prompt 06: Google Places sync + venue search history + curated "di solito" import.
-- Venues come from Google Places (New) via the places-sync Edge Function, which calls
-- public.sync_places_venues with the service role. Clients never write venues.
-- Places terms: only place_id is kept forever; name, address and opening hours expire after 30 days.

-- ---------------------------------------------------------------- per-city sync parameters
-- Queries are built from the city row, so activating a new city needs no code.
alter table public.cities
  add column places_radius_m int not null default 8000 check (places_radius_m between 1000 and 50000),
  add column places_areas text[] not null default '{}';
comment on column public.cities.places_areas is 'Neighbourhood names used to build Places text queries (no venues).';

-- Existing projects were created before this column: fill the two launch cities once.
update public.cities set places_areas = array['Navigli', 'Isola', 'Brera', 'Porta Venezia', 'Lambrate', 'Corso Como']
 where slug = 'milano' and places_areas = '{}';
update public.cities set places_areas = array['Las Canteras', 'Santa Catalina', 'Vegueta', 'Triana', 'Mesa y López']
 where slug = 'las-palmas' and places_areas = '{}';

-- Places terms: coordinates expire after 30 days too, so they must be nullable. An active venue
-- always has them; expire_stale_places() deactivates a venue in the same statement that clears them.
alter table public.venues alter column location drop not null;
alter table public.venues add constraint venues_active_has_location check (location is not null or not is_active);

-- ---------------------------------------------------------------- search history
create or replace function public.remember_venue(p_venue_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
begin
  if not exists (select 1 from public.venues where id = p_venue_id and is_active) then
    raise exception 'VENUE_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  insert into public.search_history (user_id, venue_id) values (v_me, p_venue_id)
  on conflict (user_id, venue_id) do update set searched_at = now();
end $$;
comment on function public.remember_venue(uuid) is
  'Privacy: writes only to the caller''s own search history (pruned to 20 rows daily); no other user can read it.';

-- ---------------------------------------------------------------- places upsert
-- p_rows: [{google_place_id, name, kind, lat, lng, address?, opening_hours?}]
-- Demo rule: once the city has at least 10 real active venues, ITS demo venues are switched off
-- (never deleted, never other cities'); below that they stay, so the map is never empty.
create or replace function private.upsert_places_venues(p_city_id uuid, p_rows jsonb)
returns table (inserted int, updated int, demo_deactivated int)
language plpgsql security definer set search_path = public as $$
declare
  v_inserted int;
  v_updated int;
  v_demo int := 0;
begin
  with incoming as (
    select distinct on (r.google_place_id) r.*
      from jsonb_to_recordset(p_rows) as r(
        google_place_id text, name text, kind text, lat double precision, lng double precision,
        address text, opening_hours jsonb)
     where r.google_place_id is not null and r.google_place_id not like 'demo-%'
       and r.name is not null and r.lat is not null and r.lng is not null
     order by r.google_place_id
  ), written as (
    insert into public.venues (city_id, google_place_id, name, kind, location, address, opening_hours,
                               is_active, places_synced_at)
    select p_city_id, i.google_place_id, left(i.name, 120),
           case when i.kind in ('club', 'rooftop', 'bar', 'live') then i.kind else 'other' end,
           extensions.st_setsrid(extensions.st_makepoint(i.lng, i.lat), 4326)::extensions.geography,
           i.address, i.opening_hours, true, now()
      from incoming i
    on conflict (google_place_id) do update
      set name = excluded.name, kind = excluded.kind, location = excluded.location,
          address = excluded.address, opening_hours = excluded.opening_hours,
          is_active = true, places_synced_at = now()
    returning (xmax = 0) as was_inserted
  )
  select count(*) filter (where was_inserted)::int, count(*) filter (where not was_inserted)::int
    into v_inserted, v_updated from written;

  if (select count(*) from public.venues
       where city_id = p_city_id and is_active and google_place_id not like 'demo-%') >= 10 then
    update public.venues set is_active = false
     where city_id = p_city_id and google_place_id like 'demo-%' and is_active;
    get diagnostics v_demo = row_count;
  end if;
  return query select v_inserted, v_updated, v_demo;
end $$;

create or replace function public.sync_places_venues(p_city_slug text, p_rows jsonb)
returns table (inserted int, updated int, demo_deactivated int)
language plpgsql security definer set search_path = public as $$
declare
  v_city uuid;
begin
  select id into v_city from public.cities where slug = p_city_slug;
  if v_city is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return query select * from private.upsert_places_venues(v_city, p_rows);
end $$;
comment on function public.sync_places_venues(text, jsonb) is
  'Privacy: service_role only (Edge Function places-sync); touches venue catalog data, never user data.';

-- Everything the Edge Function needs to build queries, as plain values (PostgREST would return the
-- geography column as EWKB hex).
create or replace function public.get_city_sync_info(p_city_slug text)
returns table (name text, country text, lat double precision, lng double precision,
               radius_m int, areas text[], is_active boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  return query
  select c.name, c.country, extensions.st_y(c.center::extensions.geometry),
         extensions.st_x(c.center::extensions.geometry), c.places_radius_m, c.places_areas, c.is_active
    from public.cities c where c.slug = p_city_slug;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
end $$;
comment on function public.get_city_sync_info(text) is
  'Privacy: service_role only (Edge Function places-sync); returns catalog data of a city, no user data.';

-- ---------------------------------------------------------------- Places terms: 30-day expiry
-- Only google_place_id may be stored indefinitely: older Places content (coordinates included) is wiped and the venue hidden
-- until the next sync refreshes it.
create or replace function private.expire_stale_places() returns void
language sql security definer set search_path = public as $$
  update public.venues
     set is_active = false, location = null, address = null, opening_hours = null, name = google_place_id
   where google_place_id not like 'demo-%'
     and places_synced_at < now() - interval '30 days'
     and (is_active or location is not null or address is not null or opening_hours is not null
          or name <> google_place_id)
$$;

select cron.schedule('expire-stale-places', '30 4 * * *', 'select private.expire_stale_places()');

-- ---------------------------------------------------------------- curated "di solito" layer
-- p_rows: [{google_place_id, weekday 0-6 (0 = Sunday), hour 0-23, level 0-3}], already expanded.
-- Atomic: validation errors abort the whole call. Only source='manual' rows are ever replaced.
create or replace function public.import_typical_manual(p_city_slug text, p_rows jsonb)
returns table (venues int, cells int)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_city uuid;
  v_venues int;
  v_cells int;
begin
  select id into v_city from public.cities where slug = p_city_slug;
  if v_city is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;

  if exists (select 1 from jsonb_to_recordset(p_rows) as t(google_place_id text, weekday int, hour int, level int)
              where google_place_id is null or weekday is null or hour is null or level is null
                 or weekday not between 0 and 6 or hour not between 0 and 23 or level not between 0 and 3) then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_rows) as t(google_place_id text, weekday int, hour int, level int)
              where not exists (select 1 from public.venues v
                                 where v.google_place_id = t.google_place_id and v.city_id = v_city)) then
    raise exception 'UNKNOWN_VENUE' using errcode = 'P0001';
  end if;

  delete from public.venue_typical_busyness b
   where b.source = 'manual'
     and b.venue_id in (select v.id from public.venues v
                         where v.city_id = v_city and v.google_place_id in
                           (select t.google_place_id
                              from jsonb_to_recordset(p_rows) as t(google_place_id text, weekday int, hour int, level int)));
  insert into public.venue_typical_busyness (venue_id, weekday, hour, level, source)
  select v.id, t.weekday, t.hour, t.level, 'manual'
    from (select distinct on (r.google_place_id, r.weekday, r.hour) r.*
            from jsonb_to_recordset(p_rows) as r(google_place_id text, weekday int, hour int, level int)
           order by r.google_place_id, r.weekday, r.hour) t
    join public.venues v on v.google_place_id = t.google_place_id and v.city_id = v_city;
  get diagnostics v_cells = row_count;
  select count(distinct t.google_place_id)::int into v_venues
    from jsonb_to_recordset(p_rows) as t(google_place_id text, weekday int, hour int, level int);
  return query select v_venues, v_cells;
end $$;
comment on function public.import_typical_manual(text, jsonb) is
  'Privacy: service_role only; replaces the curated (manual) "di solito" rows of the listed venues, never the history rows.';

-- ---------------------------------------------------------------- privileges (same rule as 0011)
revoke all on function public.remember_venue(uuid) from public, anon;
grant execute on function public.remember_venue(uuid) to authenticated, service_role;

revoke all on function public.sync_places_venues(text, jsonb) from public, anon, authenticated;
grant execute on function public.sync_places_venues(text, jsonb) to service_role;

revoke all on function public.get_city_sync_info(text) from public, anon, authenticated;
grant execute on function public.get_city_sync_info(text) to service_role;

revoke all on function public.import_typical_manual(text, jsonb) from public, anon, authenticated;
grant execute on function public.import_typical_manual(text, jsonb) to service_role;

revoke all on function private.upsert_places_venues(uuid, jsonb) from public, anon, authenticated;
revoke all on function private.expire_stale_places() from public, anon, authenticated;
