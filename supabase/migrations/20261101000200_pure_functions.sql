-- 0002 — Pure/stable domain functions used by triggers, RLS and RPCs.

create or replace function public.age_band(p_birth_date date) returns text
language sql stable as $$
  select case
    when p_birth_date is null then null
    when extract(year from age(current_date, p_birth_date)) < 25 then '18-24'
    when extract(year from age(current_date, p_birth_date)) < 35 then '25-34'
    when extract(year from age(current_date, p_birth_date)) < 45 then '35-44'
    else '45+'
  end
$$;
comment on function public.age_band(date) is 'Age band shown to others instead of the exact age (principle 1).';

create or replace function public.is_adult(p_birth_date date) returns boolean
language sql stable as $$
  select p_birth_date is not null and p_birth_date <= (current_date - interval '18 years')::date
$$;

-- k-anonymity (principle 2): fewer than 3 people is always "pochi", and counts are never exact.
create or replace function public.attendance_band(p_count int) returns text
language sql immutable as $$
  select case
    when p_count is null or p_count < 3 then 'pochi'
    when p_count < 10 then '3–10'
    when p_count < 20 then '10–20'
    when p_count < 30 then '20–30'
    when p_count < 50 then '30–50'
    when p_count < 100 then '50–100'
    else '100+'
  end
$$;
comment on function public.attendance_band(int) is 'Turns a head count into a band; below k = 3 it is always "pochi".';

create or replace function public.level_from_avg(p_avg numeric) returns smallint
language sql immutable as $$
  select (case
    when p_avg is null or p_avg < 3 then 0
    when p_avg < 10 then 1
    when p_avg < 30 then 2
    else 3
  end)::smallint
$$;

-- A "night" runs from 06:00 to 06:00 of the next day, in the city's time zone (DST-safe).
create or replace function public.night_date_at(p_city_id uuid, p_at timestamptz) returns date
language sql stable as $$
  select ((p_at at time zone c.timezone) - interval '6 hours')::date from public.cities c where c.id = p_city_id
$$;

create or replace function public.current_night_date(p_city_id uuid) returns date
language sql stable as $$
  select public.night_date_at(p_city_id, now())
$$;

create or replace function public.night_end(p_night_date date, p_timezone text) returns timestamptz
language sql stable as $$
  select ((p_night_date + 1)::timestamp + interval '6 hours') at time zone p_timezone
$$;

-- Principle 3: the client may only store a position snapped to the centre of a ~500 m cell.
create or replace function public.coarsen(p_point extensions.geography) returns extensions.geography
language sql immutable as $$
  select extensions.st_setsrid(extensions.st_makepoint(
    floor(extensions.st_x(p_point::extensions.geometry)::numeric / 0.005) * 0.005 + 0.0025,
    floor(extensions.st_y(p_point::extensions.geometry)::numeric / 0.005) * 0.005 + 0.0025
  ), 4326)::extensions.geography
$$;
comment on function public.coarsen(extensions.geography) is 'Snaps a point to the centre of a 0.005° (~500 m) grid cell.';

-- "Di solito" layer (principle 11): history beats manual curation for the same cell; 0 when unknown.
create or replace function public.typical_level(p_venue_id uuid, p_at timestamptz) returns smallint
language sql stable as $$
  select coalesce((
    select b.level
      from public.venue_typical_busyness b
      join public.venues v on v.id = b.venue_id
      join public.cities c on c.id = v.city_id
     where b.venue_id = p_venue_id
       and b.weekday = extract(dow from p_at at time zone c.timezone)
       and b.hour = extract(hour from p_at at time zone c.timezone)
     order by (b.source = 'history') desc
     limit 1
  ), 0)::smallint
$$;

-- ---------------------------------------------------------------- handles

create table private.handle_animals (word text primary key check (word ~ '^[a-z]+$'));
create table private.handle_colors (word text primary key check (word ~ '^[a-z]+$'));

-- Handles are proper names: same Italian words in every UI language.
insert into private.handle_animals (word) values
  ('lince'), ('volpe'), ('orso'), ('gatto'), ('lupo'), ('panda'), ('falco'), ('civetta'), ('delfino'), ('tigre'),
  ('leone'), ('aquila'), ('cervo'), ('lepre'), ('riccio'), ('tasso'), ('castoro'), ('koala'), ('zebra'), ('giraffa'),
  ('pinguino'), ('foca'), ('lontra'), ('airone'), ('cigno'), ('corvo'), ('gufo'), ('passero'), ('merlo'), ('fenicottero'),
  ('camaleonte'), ('geco'), ('tartaruga'), ('balena'), ('squalo'), ('medusa'), ('polpo'), ('granchio'), ('scoiattolo'), ('ghiro'),
  ('donnola'), ('ermellino'), ('puma'), ('giaguaro'), ('leopardo'), ('ghepardo'), ('bisonte'), ('alce'), ('renna'), ('cammello'),
  ('lama'), ('alpaca'), ('canguro'), ('colibri'), ('pavone'), ('picchio'), ('fagiano'), ('gabbiano'), ('pellicano'), ('struzzo');

insert into private.handle_colors (word) values
  ('rosso'), ('viola'), ('grigio'), ('blu'), ('verde'), ('rosa'), ('nero'), ('oro'), ('cyan'), ('bianco'),
  ('giallo'), ('arancio'), ('ambra'), ('argento'), ('bronzo'), ('corallo'), ('indaco'), ('lilla'), ('menta'), ('ocra'),
  ('perla'), ('rame'), ('smeraldo'), ('turchese'), ('zaffiro');

create or replace function public.generate_handle() returns text
language plpgsql volatile security definer set search_path = public, private as $$
declare
  v_handle text;
  v_attempt int := 0;
begin
  loop
    v_handle := (select word from private.handle_animals order by random() limit 1)
      || '.' || (select word from private.handle_colors order by random() limit 1);
    -- after many collisions (space nearly full) fall back to a numeric suffix
    if v_attempt >= 20 then
      v_handle := v_handle || (10 + floor(random() * 990))::int;
    end if;
    exit when not exists (select 1 from public.profiles where handle = v_handle);
    v_attempt := v_attempt + 1;
  end loop;
  return v_handle;
end $$;
comment on function public.generate_handle() is
  'Privacy: returns a random animale.colore handle, the only public identity; reveals nothing about the user.';

-- ---------------------------------------------------------------- nights

create or replace function private.ensure_night(p_venue_id uuid, p_night_date date) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  insert into public.nights (venue_id, night_date) values (p_venue_id, p_night_date)
  on conflict (venue_id, night_date) do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.nights where venue_id = p_venue_id and night_date = p_night_date;
  end if;
  return v_id;
end $$;
