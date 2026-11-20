-- One cover photo per venue from Apify (accepted risk, CLAUDE.md principle 11 exception, docs/typical-apify.md).
-- Only the public image URL is stored (no copy of the image), the actor's main `imageUrl` and nothing else.
-- It is shown only while a server-side flag is on and the URL is younger than 60 days.
-- Kill switch: update private.feature_flags set enabled = false where name = 'venue_photo_apify';

alter table public.venues
  add column photo_url text,
  add column photo_fetched_at timestamptz;
comment on column public.venues.photo_url is
  'Public Google image URL of the cover photo (third party, Apify). Not readable by clients: reaches them only through get_venue_detail.';
-- No grant on the new columns: the column-level select grant of the spots migration stays as it is.

-- ---------------------------------------------------------------- server-side switches
create table private.feature_flags (
  name text primary key,
  enabled boolean not null
);
alter table private.feature_flags enable row level security;
revoke all on private.feature_flags from public, anon, authenticated;
insert into private.feature_flags (name, enabled) values ('venue_photo_apify', true);

create or replace function private.feature_enabled(p_name text) returns boolean
language sql stable security definer set search_path = private as $$
  select coalesce((select f.enabled from private.feature_flags f where f.name = p_name), false)
$$;
revoke all on function private.feature_enabled(text) from public, anon, authenticated;
grant execute on function private.feature_enabled(text) to service_role;

-- ---------------------------------------------------------------- import (service_role only)
-- p_rows: [{google_place_id, image_url}]. Only https URLs on googleusercontent.com (or a subdomain) are accepted;
-- the host must be followed by "/" or the end, so "host.evil.com" and "user@evil.com" tricks never match.
-- Unknown / inactive / other-city / spot venues and invalid URLs are ignored (counted in a notice).
create or replace function public.import_venue_photos_apify(p_city_slug text, p_rows jsonb) returns int
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_city uuid;
  v_written int;
begin
  select id into v_city from public.cities where slug = p_city_slug;
  if v_city is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;

  with incoming as (
    select distinct on (t.google_place_id) t.google_place_id, t.image_url
      from jsonb_to_recordset(p_rows) as t(google_place_id text, image_url text)
     where t.image_url ~* '^https://([a-z0-9-]+\.)*googleusercontent\.com(/[^[:space:]@]*)?$'
       and length(t.image_url) <= 2000
     order by t.google_place_id
  )
  update public.venues v
     set photo_url = i.image_url, photo_fetched_at = now()
    from incoming i
   where v.google_place_id = i.google_place_id
     and v.city_id = v_city and v.is_active and v.kind <> 'spot';
  get diagnostics v_written = row_count;

  if jsonb_array_length(p_rows) > v_written then
    raise notice 'import_venue_photos_apify: % righe ignorate (URL non valido, venue sconosciuti, spenti, spot o duplicati)',
      jsonb_array_length(p_rows) - v_written;
  end if;
  return v_written;
end $$;
comment on function public.import_venue_photos_apify(text, jsonb) is
  'Privacy: service_role only; stores only the public Google image URL (googleusercontent.com, https) of active non-spot venues of the city; no personal data, no image copy; third-party source (Apify), switch-off via private.feature_flags.';
revoke all on function public.import_venue_photos_apify(text, jsonb) from public, anon, authenticated;
grant execute on function public.import_venue_photos_apify(text, jsonb) to service_role;

-- ---------------------------------------------------------------- venue detail: + photo_url (last column)
drop function public.get_venue_detail(uuid);
create function public.get_venue_detail(p_venue_id uuid)
returns table (
  venue_id uuid, name text, kind text, address text, opening_hours jsonb, google_place_id text,
  lat double precision, lng double precision,
  city_slug text, city_name text, country text, timezone text, taxi_number text,
  photo_url text
)
language plpgsql stable security definer set search_path = public, extensions as $$
#variable_conflict use_column
begin
  perform private.require_user();
  return query
  select v.id, v.name, v.kind, v.address, v.opening_hours, v.google_place_id,
         st_y(v.location::geometry), st_x(v.location::geometry),
         c.slug, c.name, c.country, c.timezone, c.taxi_phone,
         case when private.feature_enabled('venue_photo_apify') and v.photo_fetched_at > now() - interval '60 days'
              then v.photo_url end
    from public.venues v
    join public.cities c on c.id = v.city_id
   where v.id = p_venue_id and v.is_active and c.is_active
     and private.spot_is_visible(v.kind, v.hidden_at, v.spot_expires_at);
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
end $$;
comment on function public.get_venue_detail(uuid) is
  'Privacy: catalog data only (venue, city, taxi number, cover photo URL while the flag is on and the URL is under 60 days old); nothing per-user; hidden or expired spots are NOT_FOUND.';
revoke all on function public.get_venue_detail(uuid) from public, anon;
grant execute on function public.get_venue_detail(uuid) to authenticated, service_role;

-- ---------------------------------------------------------------- retention: 60 days
create or replace function private.purge_stale_venue_photos() returns void
language sql security definer set search_path = public as $$
  update public.venues set photo_url = null, photo_fetched_at = null
   where photo_fetched_at < now() - interval '60 days'
$$;
revoke all on function private.purge_stale_venue_photos() from public, anon, authenticated;
select cron.schedule('purge-stale-venue-photos', '45 4 * * *', 'select private.purge_stale_venue_photos()');
