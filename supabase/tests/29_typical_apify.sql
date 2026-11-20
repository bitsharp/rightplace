begin;
\ir helpers/setup.psql
select plan(24);

-- source check ---------------------------------------------------------------------------------------------
select tests.make_venue('Locale A') as va \gset
select tests.make_venue('Locale B') as vb \gset
select google_place_id as pid_a from venues where id = :'va' \gset
select google_place_id as pid_b from venues where id = :'vb' \gset

select lives_ok(format($$ insert into venue_typical_busyness (venue_id, weekday, hour, level, source)
  values (%L, 1, 1, 1, 'apify') $$, :'va'), 'source accetta apify');
select throws_ok(format($$ insert into venue_typical_busyness (venue_id, weekday, hour, level, source)
  values (%L, 1, 2, 1, 'google') $$, :'va'), '23514', null, 'source rifiuta valori sconosciuti');
delete from venue_typical_busyness where venue_id = :'va';

-- precedence history > manual > apify --------------------------------------------------------------------
insert into venue_typical_busyness (venue_id, weekday, hour, level, source) values (:'va', 6, 23, 1, 'apify');
select is(typical_level(:'va', '2026-10-24 23:00:00 Europe/Rome'), 1::smallint, 'solo apify → livello apify');
insert into venue_typical_busyness (venue_id, weekday, hour, level, source) values (:'va', 6, 23, 2, 'manual');
select is(typical_level(:'va', '2026-10-24 23:00:00 Europe/Rome'), 2::smallint, 'manual batte apify');
insert into venue_typical_busyness (venue_id, weekday, hour, level, source) values (:'va', 6, 23, 3, 'history');
select is(typical_level(:'va', '2026-10-24 23:00:00 Europe/Rome'), 3::smallint, 'history batte manual e apify');
delete from venue_typical_busyness where venue_id = :'va' and source = 'history';
delete from venue_typical_busyness where venue_id = :'va' and source = 'manual';
delete from venue_typical_busyness where venue_id = :'va';

-- import_typical_apify --------------------------------------------------------------------------------------
insert into venue_typical_busyness (venue_id, weekday, hour, level, source) values
  (:'va', 1, 1, 3, 'apify'), (:'va', 2, 2, 3, 'manual'), (:'va', 3, 3, 3, 'history'),
  (:'vb', 1, 1, 2, 'apify');

set local role service_role;
select public.import_typical_apify('milano', jsonb_build_array(
  jsonb_build_object('google_place_id', :'pid_a', 'weekday', 5, 'hour', 23, 'level', 3),
  jsonb_build_object('google_place_id', :'pid_a', 'weekday', 6, 'hour', 0, 'level', 2),
  jsonb_build_object('google_place_id', :'pid_a', 'weekday', 6, 'hour', 0, 'level', 2))) as written \gset
reset role;
select is(:written, 2, 'restituisce le righe scritte (duplicati collassati)');
select is((select count(*)::int from venue_typical_busyness where venue_id = :'va' and source = 'apify'), 2,
  'le vecchie righe apify del locale sono sostituite');
select is((select count(*)::int from venue_typical_busyness where venue_id = :'va' and source in ('manual', 'history')), 2,
  'le righe manual e history non sono toccate');
select is((select count(*)::int from venue_typical_busyness where venue_id = :'vb' and source = 'apify'), 1,
  'i locali fuori dal payload non sono toccati');

-- unknown / inactive / demo-other-city / spot venues are ignored, not fatal
select tests.make_venue('Spento') as vi \gset
update venues set is_active = false where id = :'vi';
select google_place_id as pid_i from venues where id = :'vi' \gset
select tests.make_venue('Punto', 'spot') as vs \gset
select google_place_id as pid_s from venues where id = :'vs' \gset
set local role service_role;
select public.import_typical_apify('milano', jsonb_build_array(
  jsonb_build_object('google_place_id', 'non-esiste', 'weekday', 0, 'hour', 0, 'level', 1),
  jsonb_build_object('google_place_id', 'demo-lp-01', 'weekday', 0, 'hour', 0, 'level', 1),
  jsonb_build_object('google_place_id', :'pid_i', 'weekday', 0, 'hour', 0, 'level', 1),
  jsonb_build_object('google_place_id', :'pid_s', 'weekday', 0, 'hour', 0, 'level', 1),
  jsonb_build_object('google_place_id', :'pid_b', 'weekday', 4, 'hour', 4, 'level', 1))) as written2 \gset
reset role;
select is(:written2, 1, 'venue sconosciuti, di altra città, spenti o spot sono ignorati');
select is((select count(*)::int from venue_typical_busyness where venue_id in (:'vi', :'vs')), 0,
  'nessuna riga per venue spenti o spot');
select is((select array_agg(weekday order by weekday) from venue_typical_busyness where venue_id = :'vb' and source = 'apify'),
  array[4::smallint], 'un locale nel payload sostituisce le sue righe apify');

set local role service_role;
select throws_ok(format($$ select public.import_typical_apify('milano', '[
  {"google_place_id": "%s", "weekday": 7, "hour": 0, "level": 1}]'::jsonb) $$, :'pid_a'),
  'INVALID_ARGUMENT', 'weekday fuori range → INVALID_ARGUMENT');
select throws_ok(format($$ select public.import_typical_apify('milano', '[
  {"google_place_id": "%s", "weekday": 0, "hour": 24, "level": 1}]'::jsonb) $$, :'pid_a'),
  'INVALID_ARGUMENT', 'hour fuori range → INVALID_ARGUMENT');
select throws_ok(format($$ select public.import_typical_apify('milano', '[
  {"google_place_id": "%s", "weekday": 0, "hour": 0, "level": 4}]'::jsonb) $$, :'pid_a'),
  'INVALID_ARGUMENT', 'level fuori range → INVALID_ARGUMENT');
select throws_ok($$ select public.import_typical_apify('milano', '{}'::jsonb) $$, 'INVALID_ARGUMENT',
  'payload non array → INVALID_ARGUMENT');
select throws_ok($$ select public.import_typical_apify('atlantide', '[]'::jsonb) $$, 'NOT_FOUND',
  'città sconosciuta → NOT_FOUND');
reset role;
select is((select count(*)::int from venue_typical_busyness where venue_id = :'va' and source = 'apify'), 2,
  'dopo gli errori nessuna scrittura parziale');

-- privileges
select tests.create_user('lince.rosso') as u \gset
select tests.authenticate_as(:'u');
select throws_ok($$ select public.import_typical_apify('milano', '[]'::jsonb) $$, '42501', null,
  'un client authenticated non esegue import_typical_apify');
reset role;
select ok(not has_function_privilege('anon', 'public.import_typical_apify(text, jsonb)', 'execute')
      and not has_function_privilege('authenticated', 'public.import_typical_apify(text, jsonb)', 'execute')
      and has_function_privilege('service_role', 'public.import_typical_apify(text, jsonb)', 'execute'),
  'import_typical_apify è solo per service_role');

-- stale cleanup in the weekly job (60 days) ----------------------------------------------------------------
delete from venue_typical_busyness where venue_id in (:'va', :'vb');
insert into venue_typical_busyness (venue_id, weekday, hour, level, source, updated_at) values
  (:'va', 1, 1, 2, 'apify', now() - interval '61 days'),
  (:'va', 1, 2, 2, 'apify', now() - interval '59 days'),
  (:'va', 1, 3, 2, 'manual', now() - interval '400 days');
select private.refresh_typical_from_history();
select is((select array_agg(hour order by hour) from venue_typical_busyness where venue_id = :'va' and source = 'apify'),
  array[2::smallint], 'il job cancella le righe apify più vecchie di 60 giorni');
select is((select count(*)::int from venue_typical_busyness where venue_id = :'va' and source = 'manual'), 1,
  'il job non cancella le righe manual vecchie');

-- map: apify rows produce a typical dot, never a hot spot ------------------------------------------------
select tests.make_venue('Con Popular times') as vm \gset
insert into venue_typical_busyness (venue_id, weekday, hour, level, source)
select :'vm'::uuid, d, h, 2, 'apify' from generate_series(0, 6) d, generate_series(0, 23) h;
select tests.authenticate_as(:'u');
create temp table general_map as select * from get_city_map('milano', 'general');
select is((select typical_level from general_map where venue_id = :'vm'), 2::smallint,
  'get_city_map mostra il typical dot da righe apify');
select is((select is_hot_spot from general_map where venue_id = :'vm'), false,
  'le righe apify non creano mai un hot spot (strato stasera invariato)');

select * from finish();
rollback;
