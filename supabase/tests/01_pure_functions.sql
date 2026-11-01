begin;
\ir helpers/setup.psql
select plan(32);

-- attendance_band: never an exact count, "pochi" below k = 3
select is(attendance_band(null), 'pochi', 'NULL → pochi');
select is(attendance_band(0), 'pochi', '0 → pochi');
select is(attendance_band(1), 'pochi', '1 → pochi');
select is(attendance_band(2), 'pochi', '2 → pochi');
select is(attendance_band(3), '3–10', '3 → 3–10');
select is(attendance_band(10), '10–20', '10 → 10–20');
select is(attendance_band(29), '20–30', '29 → 20–30');
select is(attendance_band(50), '50–100', '50 → 50–100');
select is(attendance_band(150), '100+', '150 → 100+');

-- age_band / is_adult
select is(age_band((current_date - interval '18 years')::date), '18-24', '18 anni → 18-24');
select is(age_band((current_date - interval '30 years')::date), '25-34', '30 anni → 25-34');
select is(age_band((current_date - interval '40 years')::date), '35-44', '40 anni → 35-44');
select is(age_band((current_date - interval '60 years')::date), '45+', '60 anni → 45+');
select is(age_band(null), null, 'data mancante → NULL');
select ok(is_adult((current_date - interval '18 years')::date), 'compie 18 anni oggi → maggiorenne');
select ok(not is_adult((current_date - interval '18 years' + interval '1 day')::date), 'a un giorno dai 18 → minorenne');

-- level_from_avg: same scale as manual curation
select is(level_from_avg(2.9), 0::smallint, 'media < 3 → 0');
select is(level_from_avg(3), 1::smallint, 'media 3 → 1');
select is(level_from_avg(12), 2::smallint, 'media 12 → 2');
select is(level_from_avg(30), 3::smallint, 'media 30 → 3');

-- coarsen: ~500 m grid, moves the point between 100 and 700 m
select ok(
  extensions.st_distance(
    coarsen(extensions.st_setsrid(extensions.st_makepoint(9.1900, 45.4642), 4326)::extensions.geography),
    extensions.st_setsrid(extensions.st_makepoint(9.1900, 45.4642), 4326)::extensions.geography
  ) between 100 and 700,
  'coarsen sposta il punto tra 100 e 700 m');
select ok(
  extensions.st_equals(
    coarsen(extensions.st_setsrid(extensions.st_makepoint(9.1901, 45.4641), 4326)::extensions.geography)::extensions.geometry,
    coarsen(extensions.st_setsrid(extensions.st_makepoint(9.1912, 45.4633), 4326)::extensions.geography)::extensions.geometry),
  'due punti vicini nella stessa cella diventano lo stesso punto');

-- night_date_at: 06:00 cutoff in the city time zone, DST-safe
select is(night_date_at((select id from cities where slug = 'milano'), '2026-10-24 23:30:00+02'),
  '2026-10-24'::date, 'sabato 23:30 Roma → serata di sabato');
select is(night_date_at((select id from cities where slug = 'milano'), '2026-10-25 03:00:00 Europe/Rome'::timestamptz),
  '2026-10-24'::date, '03:00 nella notte del ritorno all''ora solare → serata precedente');
select is(night_date_at((select id from cities where slug = 'milano'), '2026-03-29 03:00:00 Europe/Rome'::timestamptz),
  '2026-03-28'::date, '03:00 nella notte del passaggio all''ora legale → serata precedente');
select is(night_date_at((select id from cities where slug = 'milano'), '2026-10-25 06:00:00 Europe/Rome'::timestamptz),
  '2026-10-25'::date, 'alle 06:00 inizia la serata nuova');
select is(night_end('2026-10-24'::date, 'Europe/Rome'), '2026-10-25 06:00:00 Europe/Rome'::timestamptz,
  'la serata finisce alle 06:00 del giorno dopo, ora locale');
select ok(current_night_date((select id from cities where slug = 'milano')) is not null, 'current_night_date usa now()');

-- generate_handle: animale.colore, unique even after 1.000 profiles
select matches(generate_handle(), '^[a-z]+\.[a-z]+[0-9]*$', 'formato animale.colore');
select cmp_ok((select count(*) from private.handle_animals), '>=', 40::bigint, 'almeno 40 animali');
select cmp_ok((select count(*) from private.handle_colors), '>=', 15::bigint, 'almeno 15 colori');
insert into auth.users (id, email) select gen_random_uuid(), 'bulk' || g || '@test.local' from generate_series(1, 1000) g;
select is((select count(distinct handle) from profiles), (select count(*) from profiles),
  'generate_handle resta unico su 1.000 profili');

select * from finish();
rollback;
