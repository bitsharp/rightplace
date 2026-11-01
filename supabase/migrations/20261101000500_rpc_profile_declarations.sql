-- 0005 — RPCs: profile, coarse location, declarations.
-- Every RPC: security definer, pinned search_path, no execute for anon (see 0008), and a
-- COMMENT ON FUNCTION stating its privacy guarantee. Errors are typed codes (RpcError on the client).

create or replace function private.require_user() returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid := auth.uid();
begin
  if v_id is null or not exists (select 1 from public.profiles where id = v_id and deleted_at is null) then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;
  return v_id;
end $$;

-- Active declarations for tonight in a city (nights of tonight + events overlapping tonight).
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
   order by d.updated_at desc
   limit 1
$$;

-- ---------------------------------------------------------------- profile

create or replace function public.complete_profile(
  p_birth_date date, p_gender text, p_city_slug text, p_locale text,
  p_location_opt_in boolean, p_contacts_opt_in boolean, p_is_creator boolean
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_city uuid;
begin
  if p_birth_date is null or p_birth_date > current_date then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  if not public.is_adult(p_birth_date) then
    raise exception 'UNDERAGE' using errcode = 'P0001';
  end if;
  if p_gender not in ('female', 'male', 'other') or p_locale not in ('it', 'en') then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  select id into v_city from public.cities where slug = p_city_slug and is_active;
  if v_city is null then
    raise exception 'CITY_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  update public.profiles
     set birth_date = p_birth_date, gender = p_gender, city_id = v_city, locale = p_locale,
         location_opt_in = coalesce(p_location_opt_in, false),
         contacts_opt_in = coalesce(p_contacts_opt_in, false),
         is_creator = coalesce(p_is_creator, false)
   where id = v_me;
end $$;
comment on function public.complete_profile(date, text, text, text, boolean, boolean, boolean) is
  'Privacy: stores the birth date only to derive age band and to refuse minors (UNDERAGE); returns nothing.';

create or replace function public.set_locale(p_locale text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_locale not in ('it', 'en') then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  update public.profiles set locale = p_locale where id = private.require_user();
end $$;
comment on function public.set_locale(text) is 'Privacy: updates only the caller''s UI language.';

create or replace function public.update_coarse_location(p_lat double precision, p_lng double precision) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_me uuid := private.require_user();
begin
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  if not (select location_opt_in from public.profiles where id = v_me) then
    raise exception 'LOCATION_OPT_OUT' using errcode = 'P0001';
  end if;
  update public.profiles
     set coarse_location = public.coarsen(st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography),
         coarse_location_at = now()
   where id = v_me;
end $$;
comment on function public.update_coarse_location(double precision, double precision) is
  'Privacy: opt-in only; stores the position snapped to a ~500 m cell, wiped after 3 hours, never shown to others.';

-- ---------------------------------------------------------------- declarations

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
                     where e.id = p_event_id and e.ends_at > now() and v.is_active) then
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

create or replace function public.undeclare() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.declarations where user_id = private.require_user() and expires_at > now();
end $$;
comment on function public.undeclare() is 'Privacy: removes the caller''s icon from tonight''s venue immediately.';

create or replace function public.get_my_declaration()
returns table (declaration_id uuid, venue_id uuid, venue_name text, event_id uuid, intent text, expires_at timestamptz)
language sql stable security definer set search_path = public as $$
  select d.id, v.id, v.name, d.event_id, d.intent, d.expires_at
    from public.declarations d
    left join public.nights n on n.id = d.night_id
    left join public.events e on e.id = d.event_id
    join public.venues v on v.id = coalesce(n.venue_id, e.venue_id)
   where d.user_id = private.require_user() and d.expires_at > now()
   order by d.updated_at desc
   limit 1
$$;
comment on function public.get_my_declaration() is 'Privacy: returns only the caller''s own active declaration.';
