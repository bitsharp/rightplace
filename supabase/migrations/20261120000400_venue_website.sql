-- Venue website (lawful source: Place Details, same call that already brings regularOpeningHours).
-- Stored with the other Places content, so the same 30-day rule applies: expire_stale_places() clears it.
-- Kept separate from the photo migration so each commit is self-contained: it adds the column here and the column
-- to get_venue_detail in the same change.

alter table public.venues
  add column website_uri text,
  add column details_synced_at timestamptz;
comment on column public.venues.website_uri is
  'Website from Place Details (Google Places content: 30-day cache, cleared by expire_stale_places). Not readable by clients: reaches them only through get_venue_detail.';
comment on column public.venues.details_synced_at is
  'Last Place Details call for the venue (the Text Search sync never brings the website). Drives the 30-day refresh of places-detail; cleared with the other Places content.';
-- No grant on the new columns: the column-level select grant of the spots migration stays as it is.

-- ---------------------------------------------------------------- write (service_role only, Edge Function places-detail)
-- p_website_uri null = the place has no website: the column is cleared and the Details call is still recorded.
create or replace function public.set_venue_details(p_google_place_id text, p_website_uri text) returns boolean
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
begin
  if p_website_uri is not null and (p_website_uri !~* '^https?://[^[:space:]]+$' or length(p_website_uri) > 2048) then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  update public.venues
     set website_uri = p_website_uri, details_synced_at = now()
   where google_place_id = p_google_place_id and kind <> 'spot' and is_active;
  return found;
end $$;
comment on function public.set_venue_details(text, text) is
  'Privacy: service_role only (Edge Function places-detail); stores the public website of an active non-spot venue (http/https only, max 2048 chars); catalog data, no user data.';
revoke all on function public.set_venue_details(text, text) from public, anon, authenticated;
grant execute on function public.set_venue_details(text, text) to service_role;

-- ---------------------------------------------------------------- Places terms: 30-day expiry (adds the website)
create or replace function private.expire_stale_places() returns void
language sql security definer set search_path = public as $$
  update public.venues
     set is_active = false, location = null, address = null, opening_hours = null, name = google_place_id,
         website_uri = null, details_synced_at = null
   where source = 'places' and google_place_id not like 'demo-%'
     and places_synced_at < now() - interval '30 days'
     and (is_active or location is not null or address is not null or opening_hours is not null
          or website_uri is not null or details_synced_at is not null or name <> google_place_id)
$$;

-- ---------------------------------------------------------------- venue detail: + website_uri (last column)
drop function public.get_venue_detail(uuid);
create function public.get_venue_detail(p_venue_id uuid)
returns table (
  venue_id uuid, name text, kind text, address text, opening_hours jsonb, google_place_id text,
  lat double precision, lng double precision,
  city_slug text, city_name text, country text, timezone text, taxi_number text,
  photo_url text, website_uri text
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
              then v.photo_url end,
         v.website_uri
    from public.venues v
    join public.cities c on c.id = v.city_id
   where v.id = p_venue_id and v.is_active and c.is_active
     and private.spot_is_visible(v.kind, v.hidden_at, v.spot_expires_at);
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
end $$;
comment on function public.get_venue_detail(uuid) is
  'Privacy: catalog data only (venue, city, taxi number, cover photo URL while the flag is on and the URL is under 60 days old, website); nothing per-user; hidden or expired spots are NOT_FOUND.';
revoke all on function public.get_venue_detail(uuid) from public, anon;
grant execute on function public.get_venue_detail(uuid) to authenticated, service_role;
