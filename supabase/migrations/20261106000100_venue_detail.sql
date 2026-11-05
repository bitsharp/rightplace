-- 0017 — Venue detail with plain coordinates and the city's taxi number
-- (PostgREST returns geography as hex EWKB, so the client cannot read `location` directly).

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
   where v.id = p_venue_id and v.is_active and c.is_active;
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
end $$;
comment on function public.get_venue_detail(uuid) is
  'Privacy: catalog data only (venue, city, taxi number); nothing per-user.';

-- same rule as 0011: never executable by anon
revoke all on function public.get_venue_detail(uuid) from public, anon;
grant execute on function public.get_venue_detail(uuid) to authenticated, service_role;

-- One-off: Radio Taxi Gran Canaria (Taragranca), same format as Milano's '+39 02 8585'.
-- The seed carries the same number for `supabase db reset`.
update public.cities set taxi_phone = '+34 928 46 00 00' where slug = 'las-palmas' and taxi_phone is null;
