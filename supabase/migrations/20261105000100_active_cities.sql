-- 0016 — Active cities with plain coordinates for the map (PostgREST returns geography as hex EWKB).

create or replace function public.get_active_cities()
returns table (slug text, name text, country text, lat double precision, lng double precision, default_zoom smallint)
language sql stable security definer set search_path = public, extensions as $$
  select c.slug, c.name, c.country, st_y(c.center::geometry), st_x(c.center::geometry), c.default_zoom
    from public.cities c
   where c.is_active
   order by c.name
$$;
comment on function public.get_active_cities() is
  'Privacy: catalog data only (active cities and their map centre); nothing per-user.';

-- same rule as 0011: never executable by anon
revoke all on function public.get_active_cities() from public, anon;
grant execute on function public.get_active_cities() to authenticated, service_role;
