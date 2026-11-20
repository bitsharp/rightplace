-- 0030 — The city chosen for the map also reaches the server: profiles.city_id drives, for example,
-- the 12:00 feed digest in the city's time zone (private.queue_feed_digests).

create or replace function public.set_profile_city(p_city_slug text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_city uuid;
begin
  select id into v_city from public.cities where slug = p_city_slug and is_active;
  if v_city is null then
    raise exception 'CITY_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  update public.profiles set city_id = v_city where id = v_me and city_id is distinct from v_city;
end $$;
comment on function public.set_profile_city(text) is
  'Privacy: sets only the caller''s own map city; no location is stored or sent. Only active cities; idempotent.';

revoke all on function public.set_profile_city(text) from public, anon;
grant execute on function public.set_profile_city(text) to authenticated, service_role;
