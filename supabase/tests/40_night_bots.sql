begin;
\ir helpers/setup.psql
select plan(68);

-- Fixtures ----------------------------------------------------------------------------------------------------
insert into public.cities (slug, name, country, center, default_zoom, timezone, taxi_phone, is_active)
select 'testville', 'Testville', 'IT', center, default_zoom, 'Europe/Rome', taxi_phone, true from public.cities where slug = 'milano';
insert into public.cities (slug, name, country, center, default_zoom, timezone, taxi_phone, is_active)
select 'bustown', 'Bustown', 'IT', center, default_zoom, 'Europe/Rome', taxi_phone, true from public.cities where slug = 'milano';
insert into public.cities (slug, name, country, center, default_zoom, timezone, taxi_phone, is_active)
select 'smalltown', 'Smalltown', 'IT', center, default_zoom, 'Europe/Rome', taxi_phone, true from public.cities where slug = 'milano';

-- 45 venues at peak level 3 in their own city: the cap of 40 per city is testable without the seed interfering
create temp table big_city as
  select tests.make_venue('Grande ' || lpad(i::text, 2, '0'), 'club', 'testville') as venue_id from generate_series(1, 45) i;
insert into venue_typical_busyness (venue_id, weekday, hour, level, source)
select b.venue_id, d, h, 3, 'manual' from big_city b, generate_series(0, 6) d, generate_series(0, 23) h;

create function tests.fill_typical(p_venue uuid, p_level int) returns void language sql as $$
  insert into venue_typical_busyness (venue_id, weekday, hour, level, source)
  select p_venue, d, h, p_level, 'manual' from generate_series(0, 6) d, generate_series(0, 23) h
$$;

select tests.make_venue('Livello tre', 'club', 'smalltown') as v3 \gset
select tests.make_venue('Livello due', 'club', 'smalltown') as v2 \gset
select tests.make_venue('Livello uno', 'club', 'smalltown') as v1 \gset
select tests.make_venue('Punto libero', 'spot', 'smalltown') as vspot \gset
select tests.fill_typical(:'v3', 3);
select tests.fill_typical(:'v2', 2);
select tests.fill_typical(:'v1', 1);
select tests.fill_typical(:'vspot', 3);

select public.current_night_date((select id from cities where slug = 'milano')) as night \gset

-- Structure, privileges, job ----------------------------------------------------------------------------------
select has_table('private', 'night_bot_presence', 'la tabella delle presenze stimate esiste');
select is((select relrowsecurity from pg_class where oid = 'private.night_bot_presence'::regclass), true, 'con RLS attiva');
select is(has_table_privilege('authenticated', 'private.night_bot_presence', 'select')
       or has_table_privilege('anon', 'private.night_bot_presence', 'select'), false,
  'nessun privilegio a anon e authenticated');
select is(has_function_privilege('authenticated', 'private.generate_night_bots(date)', 'execute')
       or has_function_privilege('authenticated', 'private.night_bot_counts(uuid, date)', 'execute'), false,
  'generatore e contatori non sono eseguibili dai client');
select is((select enabled from private.feature_flags where name = 'night_bots'), true, 'il flag night_bots è acceso di default');
select is((select schedule from cron.job where jobname = 'generate-night-bots'), '10 5 * * *', 'job pg_cron alle 05:10 UTC');

-- Generation --------------------------------------------------------------------------------------------------
select private.generate_night_bots(:'night'::date) as written \gset
select is(:'written'::int, (select count(*)::int from private.night_bot_presence where night_date = :'night'::date),
  'restituisce le righe scritte');
select is((select count(*)::int from private.night_bot_presence where venue_id in (:'v3', :'v2')), 2, 'livello di picco 2 e 3 hanno presenze');
select is((select count(*)::int from private.night_bot_presence where venue_id in (:'v1', :'vspot')), 0,
  'livello 1 e spot non ne hanno mai');
select ok((select going between 18 and 45 and maybe between 8 and 24 from private.night_bot_presence where venue_id = :'v3'),
  'livello 3: going 18-45, maybe 8-24');
select ok((select going between 6 and 18 and maybe between 3 and 10 from private.night_bot_presence where venue_id = :'v2'),
  'livello 2: going 6-18, maybe 3-10');
select is((select count(*)::int from private.night_bot_presence p join big_city b using (venue_id)), 40,
  'al massimo 40 locali per città');

create temp table first_run as select venue_id, going, maybe from private.night_bot_presence where night_date = :'night'::date;
select private.generate_night_bots(:'night'::date);
select is((select count(*)::int from (select * from first_run except
            select venue_id, going, maybe from private.night_bot_presence where night_date = :'night'::date) d), 0,
  'stessa data, stessi numeri (idempotente e stabile nella serata)');
select is((select count(*)::int from private.night_bot_presence where night_date = :'night'::date), (select count(*)::int from first_run),
  'rigenerare non duplica le righe');

select private.generate_night_bots(:'night'::date + 1);
select cmp_ok((select count(*)::int from private.night_bot_presence a join private.night_bot_presence b
                on a.venue_id = b.venue_id and a.night_date = :'night'::date and b.night_date = :'night'::date + 1
               where a.going <> b.going or a.maybe <> b.maybe), '>', 0,
  'un''altra data dà numeri diversi');

select is((select going from private.night_bot_counts(:'v3', :'night'::date)),
  (select going from private.night_bot_presence where venue_id = :'v3' and night_date = :'night'::date),
  'night_bot_counts legge la riga');
select is((select going + maybe from private.night_bot_counts(:'v1', :'night'::date)), 0, 'senza riga: 0 e 0');

-- Reads: fixed rows, to know the numbers ----------------------------------------------------------------------
-- 0 real people, bots 20 + 5
select tests.make_venue('Solo bot') as vb \gset
-- 1 real person, bots 20 + 5
select tests.make_venue('Uno vero') as vh \gset
-- 3 real people, bots 30 + 10
select tests.make_venue('Tre veri') as vk \gset
-- 2 real people, bots 30 + 10
select tests.make_venue('Due veri') as vt \gset
-- 3 real people, no bots
select tests.make_venue('Senza bot') as vn \gset
-- 1 friend, bots 40 + 10
select tests.make_venue('Amico e bot') as vf \gset
insert into private.night_bot_presence (venue_id, night_date, going, maybe) values
  (:'vb', :'night'::date, 20, 5), (:'vh', :'night'::date, 20, 5), (:'vk', :'night'::date, 30, 10),
  (:'vt', :'night'::date, 30, 10), (:'vf', :'night'::date, 40, 10);

select tests.create_user('lince.rosso') as me \gset
select tests.create_user('volpe.viola', 25) as friend \gset
select tests.make_declaration(tests.create_user(tests.unique_handle('uno'), 25), :'vh', 'going');
select tests.make_declaration(tests.create_user(tests.unique_handle('tre'), 20, 'female'), :'vk', 'going');
select tests.make_declaration(tests.create_user(tests.unique_handle('tre'), 30, 'female'), :'vk', 'going');
select tests.make_declaration(tests.create_user(tests.unique_handle('tre'), 40, 'male'), :'vk', 'going');
select tests.make_crowd(:'vt', 2, 'going', 25, 'female');
select tests.make_crowd(:'vn', 3, 'going', 25, 'female');
select tests.make_declaration(:'friend', :'vf', 'going');
select tests.follow(:'me', :'friend');

select tests.authenticate_as(:'me');
create temp table gmap as select * from get_city_map('milano', 'general');
create temp table fmap as select * from get_city_map('milano', 'friends');

select is((select going_band from gmap where venue_id = :'vb'), public.attendance_band(20), 'mappa: fascia = bot da soli (20)');
select is((select maybe_band from gmap where venue_id = :'vb'), public.attendance_band(5), 'mappa: fascia forse = bot (5)');
select is((select going_band from gmap where venue_id = :'vh'), public.attendance_band(21), 'mappa: fascia = 1 vero + 20 bot');
select is((select is_hot_spot from gmap where venue_id = :'vh'), true, 'mappa: la soglia hot spot usa il totale');
select is((select is_estimate from gmap where venue_id = :'vh'), true, 'mappa: is_estimate con bot');
select is((select is_estimate from gmap where venue_id = :'vn'), false, 'mappa: is_estimate falso senza bot');
select is((select count(*)::int from gmap where venue_id = :'vspot'), 0, 'mappa: lo spot non ha bot');
select is((select is_estimate from fmap where venue_id = :'vf'), false, 'mappa amici: nessuna stima');
select is((select going_band from fmap where venue_id = :'vf'), 'pochi', 'mappa amici: solo dichiarazioni vere');
select is((select count(*)::int from fmap where venue_id = :'vb'), 0, 'mappa amici: i bot non creano locali');

create temp table s_one as select * from get_venue_stats(:'vh');
create temp table s_two as select * from get_venue_stats(:'vt');
create temp table s_three as select * from get_venue_stats(:'vk');
select is((select going_band from s_one), public.attendance_band(21), 'stats: fascia = vero + bot');
select is((select is_estimate from s_one), true, 'stats: is_estimate');
select is((select avg_age is null and female_pct is null and male_pct is null and other_pct is null from s_one), true,
  'stats: 1 vero + 20 bot → età e genere null');
select is((select avg_age is null and female_pct is null from s_two), true, 'stats: 2 veri + 40 bot → età e genere null');
select is((select going_band from s_three), public.attendance_band(33), 'stats: 3 veri + 30 bot → fascia con i bot');
select is((select avg_age from s_three), 30::numeric, 'stats: età media calcolata solo sui 3 veri (20, 30, 40)');
select is((select female_pct from s_three), 67, 'stats: % donne solo sui 3 veri');
select is((select male_pct from s_three), 33, 'stats: % uomini solo sui 3 veri');
select is((select other_pct from s_three), 0, 'stats: % altro solo sui 3 veri');
select is((select is_estimate from get_venue_stats(:'vn')), false, 'stats: senza bot is_estimate falso');
select is((select jsonb_array_length(friends) from get_venue_stats(:'vf')), 1, 'stats: amici = solo persone vere');

select is((select venue_id from get_recommended_venue('milano') where reason = 'hot'), :'vf'::uuid,
  'consigliata: il più caldo conta anche i bot (1 + 40 + 10)');
select is((select is_estimate from get_recommended_venue('milano')), true, 'consigliata: is_estimate');

select is((select going_band from search_venues('milano', null, 'Uno vero')), public.attendance_band(21), 'ricerca: fascia con bot');
select is((select is_estimate from search_venues('milano', null, 'Uno vero')), true, 'ricerca: is_estimate');
select is((select is_estimate from search_venues('milano', null, 'Senza bot')), false, 'ricerca: senza bot is_estimate falso');


-- Creator events, history, flag ---------------------------------------------------------------------------------
reset role;
create function tests.slot_start(p_tz text, p_days int) returns timestamptz language sql as $$
  select (((now() at time zone p_tz)::date + p_days)::timestamp + interval '22 hours') at time zone p_tz
$$;
select tests.create_user('orso.verde') as creator \gset
update public.profiles set is_creator = true where id = :'creator';
insert into public.events (creator_id, venue_id, name, starts_at, ends_at)
values (:'creator', :'vb', 'Serata creator', tests.slot_start('Europe/Rome', 1), tests.slot_start('Europe/Rome', 1) + interval '4 hours')
returning id as ev \gset
select tests.authenticate_as(:'me');
select is((select going_band from get_event_detail(:'ev')), 'pochi', 'evento creator: nessun bot nelle adesioni');
select is((select count(*)::int from pg_proc p where p.proname = 'get_event_detail'
            and 'is_estimate' = any(p.proargnames)), 0, 'evento creator: nessuna colonna is_estimate');
reset role;

select private.refresh_typical_from_history();
select is((select count(*)::int from venue_typical_busyness where source = 'history' and venue_id in (:'vb', :'vh', :'vk', :'vf')), 0,
  'la storia tipica ignora i bot');

-- Busiest tonight ----------------------------------------------------------------------------------------------
reset role;
select tests.make_venue('Alfa tre', 'club', 'bustown') as b3a \gset
select tests.make_venue('Beta tre', 'club', 'bustown') as b3b \gset
select tests.make_venue('Gamma due', 'bar', 'bustown') as b2 \gset
select tests.make_venue('Delta uno', 'bar', 'bustown') as b1 \gset
select tests.make_venue('Spot tre', 'spot', 'bustown') as bspot \gset
select tests.make_venue('Tardi', 'club', 'bustown') as blate \gset
select tests.make_venue('Dopo cinque ore', 'club', 'bustown') as bfar \gset
select tests.make_venue('Presto uno poi tre', 'club', 'bustown') as bsoon \gset
select tests.fill_typical(:'b3a', 3);
select tests.fill_typical(:'b3b', 3);
select tests.fill_typical(:'b2', 2);
select tests.fill_typical(:'b1', 1);
select tests.fill_typical(:'bspot', 3);
select tests.fill_typical(:'bsoon', 1);
select tests.fill_typical(:'blate', 0);
select tests.fill_typical(:'bfar', 0);
-- bsoon: level 3 exactly 2 hours from now; bfar: level 3 only 5 hours from now (outside the window)
update venue_typical_busyness set level = 3
 where venue_id = :'bsoon' and weekday = extract(dow from (now() + interval '2 hours') at time zone 'Europe/Rome')
   and hour = extract(hour from (now() + interval '2 hours') at time zone 'Europe/Rome');
update venue_typical_busyness set level = 3
 where venue_id = :'bfar' and weekday = extract(dow from (now() + interval '5 hours') at time zone 'Europe/Rome')
   and hour = extract(hour from (now() + interval '5 hours') at time zone 'Europe/Rome');
-- 'Tardi' (blate) is level 0 all day: never listed. Bots + real people on Alfa.
insert into private.night_bot_presence (venue_id, night_date, going, maybe)
values (:'b3a', public.current_night_date((select id from cities where slug = 'bustown')), 25, 9);
select tests.make_declaration(tests.create_user(tests.unique_handle('bus'), 25), :'b3a', 'going');

select tests.authenticate_as(:'me');
create temp table busy as select * from get_busiest_tonight('bustown');
select is((select array_agg(name order by ord) from (select name, row_number() over () as ord from busy) x),
  array['Alfa tre', 'Beta tre', 'Presto uno poi tre', 'Gamma due'],
  'più animati: ordine per livello poi nome; considera le prossime 3 ore; esclude livello 0-1, spot e oltre la finestra');
select is((select typical_level from busy where name = 'Presto uno poi tre'), 3::smallint, 'il livello è il massimo nella finestra');
select is((select going_band from busy where name = 'Alfa tre'), public.attendance_band(26), 'fascia stasera = vero + bot');
select is((select is_estimate from busy where name = 'Alfa tre'), true, 'is_estimate con bot');
select is((select is_estimate from busy where name = 'Beta tre'), false, 'is_estimate falso senza bot');
select is((select cover_photo_url from busy where name = 'Alfa tre'), null, 'foto assente → null');
select is((select count(*)::int from get_busiest_tonight('bustown', 2)), 2, 'rispetta p_limit');
select is((select count(*)::int from get_busiest_tonight('bustown')), 4, 'default 5: qui ne esistono 4');
select throws_ok($$ select * from get_busiest_tonight('non-esiste') $$, 'CITY_NOT_ACTIVE', 'città sconosciuta rifiutata');
reset role;
select is(has_function_privilege('anon', 'public.get_busiest_tonight(text, int)', 'execute'), false, 'anon non può eseguire get_busiest_tonight');
select ok(obj_description('public.get_busiest_tonight(text, int)'::regprocedure, 'pg_proc') is not null, 'get_busiest_tonight ha COMMENT');

-- Master switch ------------------------------------------------------------------------------------------------
update private.feature_flags set enabled = false where name = 'night_bots';
delete from public.search_history;
select is(private.generate_night_bots(:'night'::date + 2), 0, 'flag spento: il generatore non scrive');
select is((select going + maybe from private.night_bot_counts(:'vh', :'night'::date)), 0, 'flag spento: night_bot_counts 0/0');
select tests.authenticate_as(:'me');
select is((select count(*)::int from get_city_map('milano', 'general') where venue_id = :'vh'), 0, 'flag spento: 1 vero + niente bot non è più sulla mappa');
select is((select going_band from get_city_map('milano', 'general') where venue_id = :'vk'), public.attendance_band(3), 'flag spento: mappa come prima (solo i 3 veri)');
select is((select is_estimate from get_city_map('milano', 'general') where venue_id = :'vk'), false, 'flag spento: mappa senza STIMA');
select is((select going_band from get_venue_stats(:'vh')), 'pochi', 'flag spento: stats come prima');
select is((select is_estimate from get_venue_stats(:'vh')), false, 'flag spento: stats senza STIMA');
select is((select is_estimate from search_venues('milano', null, 'Uno vero')), false, 'flag spento: ricerca senza STIMA');
select isnt((select venue_id from get_recommended_venue('milano')), :'vf'::uuid, 'flag spento: consigliata senza i bot');
select is((select is_estimate from get_recommended_venue('milano')), false, 'flag spento: consigliata senza STIMA');
select is((select is_estimate from get_busiest_tonight('bustown') where name = 'Alfa tre'), false, 'flag spento: più animati senza STIMA');

select * from finish();
rollback;
