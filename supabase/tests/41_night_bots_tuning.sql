begin;
\ir helpers/setup.psql
select plan(13);

-- Fixtures: 20 venues at peak level 3 and 60 at level 2 in a city of their own, plus a small city.
insert into public.cities (slug, name, country, center, default_zoom, timezone, taxi_phone, is_active)
select 'tunetown', 'Tunetown', 'IT', center, default_zoom, 'Europe/Rome', taxi_phone, true from public.cities where slug = 'milano';
insert into public.cities (slug, name, country, center, default_zoom, timezone, taxi_phone, is_active)
select 'minitown', 'Minitown', 'IT', center, default_zoom, 'Europe/Rome', taxi_phone, true from public.cities where slug = 'milano';

create temp table l3 as
  select tests.make_venue('Tre ' || lpad(i::text, 2, '0'), 'club', 'tunetown') as venue_id from generate_series(1, 20) i;
create temp table l2 as
  select tests.make_venue('Due ' || lpad(i::text, 2, '0'), 'club', 'tunetown') as venue_id from generate_series(1, 60) i;
insert into venue_typical_busyness (venue_id, weekday, hour, level, source)
select b.venue_id, d, h, 3, 'manual' from l3 b, generate_series(0, 6) d, generate_series(0, 23) h;
insert into venue_typical_busyness (venue_id, weekday, hour, level, source)
select b.venue_id, d, h, 2, 'manual' from l2 b, generate_series(0, 6) d, generate_series(0, 23) h;

-- small city: 5 level-3 venues (all under the cap) and 3 level-2
create temp table s3 as
  select tests.make_venue('Mini tre ' || i, 'club', 'minitown') as venue_id from generate_series(1, 5) i;
create temp table s2 as
  select tests.make_venue('Mini due ' || i, 'club', 'minitown') as venue_id from generate_series(1, 3) i;
insert into venue_typical_busyness (venue_id, weekday, hour, level, source)
select b.venue_id, d, h, 3, 'manual' from s3 b, generate_series(0, 6) d, generate_series(0, 23) h;
insert into venue_typical_busyness (venue_id, weekday, hour, level, source)
select b.venue_id, d, h, 2, 'manual' from s2 b, generate_series(0, 6) d, generate_series(0, 23) h;

select public.current_night_date((select id from cities where slug = 'milano')) as night \gset
select private.generate_night_bots(:'night'::date);

select is((select count(*)::int from private.night_bot_presence p join public.venues v on v.id = p.venue_id
            where p.night_date = :'night'::date and v.city_id = (select id from cities where slug = 'tunetown')), 14,
  'al massimo 14 locali per città');
select is((select count(*)::int from private.night_bot_presence p join l3 using (venue_id) where p.night_date = :'night'::date), 14,
  'con più di 14 locali di livello 3 il limite è riempito solo da loro');
select is((select count(*)::int from private.night_bot_presence p join l2 using (venue_id) where p.night_date = :'night'::date), 0,
  'e nessun livello 2 entra');

select is((select count(*)::int from private.night_bot_presence p join s3 using (venue_id) where p.night_date = :'night'::date), 5,
  'città piccola: tutti i livello 3 entrano');
select cmp_ok((select count(*)::int from private.night_bot_presence p join s2 using (venue_id) where p.night_date = :'night'::date),
  '<=', 3, 'città piccola: solo una parte dei livello 2');

-- Level 2 sampling: many venues in a city without level 3 → about one in three, up to the cap.
create temp table m2 as
  select tests.make_venue('Mid ' || lpad(i::text, 2, '0'), 'club', 'minitown') as venue_id from generate_series(1, 90) i;
insert into venue_typical_busyness (venue_id, weekday, hour, level, source)
select b.venue_id, d, h, 2, 'manual' from m2 b, generate_series(0, 6) d, generate_series(0, 23) h;
select private.generate_night_bots(:'night'::date);
select ok((select count(*) between 1 and 9 from private.night_bot_presence p join m2 using (venue_id) where p.night_date = :'night'::date),
  'livello 2: solo circa 1 su 3, fino al limite (14 - 5 livello 3)');
select ok((select count(*) < 90 / 2 from private.night_bot_presence p join m2 using (venue_id) where p.night_date = :'night'::date),
  'livello 2: ben meno della metà dei locali');

select ok((select bool_and(going between 10 and 35 and maybe between 4 and 14) from private.night_bot_presence p join l3 using (venue_id)
            where p.night_date = :'night'::date), 'livello 3: going 10-35, maybe 4-14');
select ok((select bool_and(going between 3 and 12 and maybe between 1 and 6) from private.night_bot_presence p join m2 using (venue_id)
            where p.night_date = :'night'::date), 'livello 2: going 3-12, maybe 1-6');
select cmp_ok((select count(distinct going)::int from private.night_bot_presence p join l3 using (venue_id) where p.night_date = :'night'::date),
  '>=', 5, 'i numeri sono vari tra i locali');

create temp table run1 as select venue_id, going, maybe from private.night_bot_presence where night_date = :'night'::date;
select private.generate_night_bots(:'night'::date);
select is((select count(*)::int from (select * from run1 except
            select venue_id, going, maybe from private.night_bot_presence where night_date = :'night'::date) d), 0,
  'stessa data: stessa selezione e stessi numeri');

select private.generate_night_bots(:'night'::date + 1);
select cmp_ok((select count(*)::int from (
    select venue_id from private.night_bot_presence where night_date = :'night'::date
    except select venue_id from private.night_bot_presence where night_date = :'night'::date + 1) d), '>', 0,
  'un''altra data sceglie anche locali di livello 2 diversi');
select is((select count(*)::int from private.night_bot_presence p join public.venues v on v.id = p.venue_id
            where p.night_date = :'night'::date + 1 and v.city_id = (select id from cities where slug = 'tunetown')), 14,
  'un''altra data: sempre al massimo 14');

select * from finish();
rollback;
