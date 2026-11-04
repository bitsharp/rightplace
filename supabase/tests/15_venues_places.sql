begin;
\ir helpers/setup.psql
select plan(52);

select tests.create_user('lince.rosso') as a \gset
select tests.make_venue('Attivo') as v \gset
select tests.make_venue('Spento') as v_off \gset
update venues set is_active = false where id = :'v_off';

-- ------------------------------------------------------------ remember_venue
select tests.authenticate_as(:'a');
select lives_ok($$ select remember_venue((select id from venues where name = 'Attivo' limit 1)) $$,
  'remember_venue accetta un locale attivo');
reset role;
select is((select count(*)::int from search_history where user_id = :'a' and venue_id = :'v'), 1,
  'il locale entra nella cronologia dell''utente');

update search_history set searched_at = now() - interval '2 days' where user_id = :'a' and venue_id = :'v';
select tests.authenticate_as(:'a');
select remember_venue(:'v');
reset role;
select is((select count(*)::int from search_history where user_id = :'a'), 1, 'una seconda chiamata non duplica la riga');
select ok((select searched_at > now() - interval '1 minute' from search_history where user_id = :'a' and venue_id = :'v'),
  'ma aggiorna searched_at');

select tests.authenticate_as(:'a');
select throws_ok(format($$ select remember_venue(%L) $$, :'v_off'), 'VENUE_NOT_ACTIVE',
  'un locale inattivo è rifiutato');
select throws_ok($$ select remember_venue(gen_random_uuid()) $$, 'VENUE_NOT_ACTIVE',
  'un locale inesistente è rifiutato');
reset role;
select ok(not has_function_privilege('anon', 'public.remember_venue(uuid)', 'execute'),
  'anon non esegue remember_venue');

-- ------------------------------------------------------------ privileges of the sync functions
select tests.authenticate_as(:'a');
select throws_ok($$ select * from sync_places_venues('milano', '[]'::jsonb) $$, '42501', null,
  'un client authenticated non esegue sync_places_venues');
select throws_ok($$ select * from private.upsert_places_venues((select id from cities where slug = 'milano'), '[]'::jsonb) $$,
  '42501', null, 'un client non esegue upsert_places_venues');
select throws_ok($$ select private.expire_stale_places() $$, '42501', null, 'un client non esegue expire_stale_places');
reset role;
select tests.authenticate_as(:'a');
select throws_ok($$ select * from import_typical_manual('milano', '[]'::jsonb) $$, '42501', null,
  'un client authenticated non esegue import_typical_manual');
reset role;
select ok(not has_function_privilege('anon', 'public.import_typical_manual(text, jsonb)', 'execute')
      and has_function_privilege('service_role', 'public.import_typical_manual(text, jsonb)', 'execute'),
  'import_typical_manual è solo per service_role');
select ok(not has_function_privilege('anon', 'public.sync_places_venues(text, jsonb)', 'execute'),
  'anon non esegue sync_places_venues');
select ok(has_function_privilege('service_role', 'public.sync_places_venues(text, jsonb)', 'execute'),
  'service_role esegue sync_places_venues');

-- ------------------------------------------------------------ city sync info
select count(*)::int as lp_demo from venues v join cities c on c.id = v.city_id
 where c.slug = 'las-palmas' and v.google_place_id like 'demo-lp-%' and v.is_active \gset
select count(*)::int as mi_demo from venues v join cities c on c.id = v.city_id
 where c.slug = 'milano' and v.google_place_id like 'demo-%' and v.is_active \gset
select ok(:lp_demo = 10 and :mi_demo = 20, 'il seed ha 10 demo a Las Palmas e 20 a Milano');

select ok(not has_function_privilege('anon', 'public.get_city_sync_info(text)', 'execute')
      and not has_function_privilege('authenticated', 'public.get_city_sync_info(text)', 'execute')
      and has_function_privilege('service_role', 'public.get_city_sync_info(text)', 'execute'),
  'get_city_sync_info è solo per service_role');
set local role service_role;
select name as city_name, country as city_country, lat as city_lat, lng as city_lng, radius_m as city_radius,
       areas as city_areas, is_active as city_active
  from public.get_city_sync_info('las-palmas') \gset
select throws_ok($$ select * from public.get_city_sync_info('atlantide') $$, 'NOT_FOUND', 'città sconosciuta → NOT_FOUND');
select is_active as madrid_active from public.get_city_sync_info('madrid') \gset
reset role;
select ok(:'city_name' = 'Las Palmas' and :'city_country' = 'ES' and abs(:city_lat - 28.1235) < 0.001
      and abs(:city_lng + 15.4134) < 0.001, 'nome, paese e centro come numeri');
select ok(:city_radius = 8000 and :'city_areas' = '{"Las Canteras","Santa Catalina",Vegueta,Triana,"Mesa y López"}'
      and :'city_active' = 't' and :'madrid_active' = 'f', 'raggio, aree e stato attivo dalla riga della città');
select throws_ok($$ update cities set places_radius_m = 500 where slug = 'milano' $$, '23514', null,
  'il raggio fuori da 1000–50000 m è rifiutato');

-- ------------------------------------------------------------ sync_places_venues
create function tests.real_rows(p_prefix text, p_count int) returns jsonb language sql as $$
  select jsonb_agg(jsonb_build_object('google_place_id', p_prefix || i, 'name', 'Locale ' || i,
    'kind', 'bar', 'lat', 28.13, 'lng', -15.43, 'address', 'Calle ' || i, 'opening_hours', null))
    from generate_series(1, p_count) i
$$;

select tests.real_rows('test-lp-', 3) as rows3, tests.real_rows('test-lp-', 9) as rows9,
       tests.real_rows('test-lp-', 10) as rows10 \gset
set local role service_role;
select inserted as ins, updated as upd, demo_deactivated as dem from public.sync_places_venues('las-palmas', '[]'::jsonb) \gset
reset role;
select is(array[:ins, :upd, :dem], array[0, 0, 0], 'zero righe → zero scritture');

set local role service_role;
select inserted as ins, updated as upd, demo_deactivated as dem
  from public.sync_places_venues('las-palmas', :'rows3'::jsonb) \gset
reset role;
select is(array[:ins, :upd, :dem], array[3, 0, 0], 'prima sync con 3 locali reali: 3 inseriti');
select is((select count(*)::int from venues v join cities c on c.id = v.city_id
            where c.slug = 'las-palmas' and v.google_place_id like 'demo-lp-%' and v.is_active), :lp_demo,
  'con meno di 10 locali reali i demo restano attivi');

set local role service_role;
select inserted as ins, updated as upd, demo_deactivated as dem
  from public.sync_places_venues('las-palmas', :'rows9'::jsonb) \gset
reset role;
select is(array[:ins, :upd, :dem], array[6, 3, 0], 'seconda sync: 6 inseriti e 3 aggiornati, 9 reali → demo ancora attivi');

set local role service_role;
select inserted as ins, updated as upd, demo_deactivated as dem
  from public.sync_places_venues('las-palmas', :'rows10'::jsonb) \gset
reset role;
select is(array[:ins, :upd, :dem], array[1, 9, 10], 'con 10 locali reali i 10 demo di Las Palmas sono disattivati');
select is((select count(*)::int from venues where google_place_id like 'demo-lp-%'), 10, 'i demo non sono cancellati');
select is((select count(*)::int from venues v join cities c on c.id = v.city_id
            where c.slug = 'milano' and v.google_place_id like 'demo-%' and v.is_active), :mi_demo,
  'i demo di Milano non sono toccati');

set local role service_role;
select inserted as ins, updated as upd, demo_deactivated as dem
  from public.sync_places_venues('las-palmas', :'rows10'::jsonb) \gset
reset role;
select is(array[:ins, :upd, :dem], array[0, 10, 0], 'una terza sync identica non duplica nulla');
select is((select count(*)::int from venues where google_place_id like 'test-lp-%'), 10, 'un solo record per place_id');

set local role service_role;
select inserted as ins from public.sync_places_venues('milano', $json$[
  {"google_place_id": "test-places-1", "name": "Locale Uno", "kind": "club", "lat": 45.46, "lng": 9.19,
   "address": "Via Uno 1", "opening_hours": {"weekdayDescriptions": ["lun"]}},
  {"google_place_id": "test-places-2", "name": "Locale Due", "kind": "strano", "lat": 45.47, "lng": 9.20},
  {"google_place_id": "test-places-2", "name": "Locale Due bis", "kind": "rooftop", "lat": 45.47, "lng": 9.20},
  {"google_place_id": "demo-injected", "name": "Falso demo", "kind": "bar", "lat": 45.47, "lng": 9.20}
]$json$::jsonb) \gset
reset role;
select is(:ins, 2, 'duplicati nello stesso lotto contati una volta; place_id demo-* ignorati');
select ok((select is_active and places_synced_at is not null and kind = 'club' and address = 'Via Uno 1'
             and opening_hours is not null from venues where google_place_id = 'test-places-1'),
  'il locale è attivo, con data di sync, tipo, indirizzo e orari');
select is((select kind from venues where google_place_id = 'test-places-2'), 'other', 'un tipo sconosciuto diventa other');
select is((select count(*)::int from venues where google_place_id = 'demo-injected'), 0, 'nessun demo creato dalla sync');
select is((select count(*)::int from venues where google_place_id like 'demo-%' and city_id =
            (select id from cities where slug = 'milano') and is_active), :mi_demo,
  'a Milano con 2 reali + 1 test i demo restano attivi');

set local role service_role;
select throws_ok($$ select * from public.sync_places_venues('atlantide', '[]'::jsonb) $$, 'NOT_FOUND',
  'città sconosciuta → NOT_FOUND');
reset role;

-- ------------------------------------------------------------ expire_stale_places
update venues set places_synced_at = now() - interval '31 days' where google_place_id = 'test-places-1';
update venues set places_synced_at = now() - interval '2 days' where google_place_id = 'test-places-2';
select private.expire_stale_places();
select ok((select address is null and opening_hours is null and location is null and name = google_place_id
                  and not is_active from venues where google_place_id = 'test-places-1'),
  'oltre 30 giorni: nome, coordinate, indirizzo e orari Places sono azzerati e il locale è disattivato');
select ok((select location is not null from venues where google_place_id = 'test-places-2'),
  'un locale sincronizzato da poco conserva le coordinate');
select throws_ok($$ update venues set is_active = true where google_place_id = 'test-places-1' $$, '23514', null,
  'un locale attivo deve avere le coordinate');
set local role service_role;
select inserted as ins, updated as upd from public.sync_places_venues('milano', $json$[
  {"google_place_id": "test-places-1", "name": "Locale Uno", "kind": "club", "lat": 45.46, "lng": 9.19}]$json$::jsonb) \gset
reset role;
select ok((select location is not null and is_active and name = 'Locale Uno' from venues where google_place_id = 'test-places-1'),
  'la sync successiva reimposta coordinate, nome e stato attivo');
update venues set places_synced_at = now() - interval '31 days' where google_place_id = 'test-places-1';
select private.expire_stale_places();
select ok((select name like 'Locale Due%' and is_active from venues where google_place_id = 'test-places-2'),
  'un locale sincronizzato da poco non è toccato');
select is((select count(*)::int from venues where name = 'Attivo' and is_active), 1,
  'i locali senza dati Places (places_synced_at nullo) non sono toccati');
select ok(exists (select 1 from cron.job where jobname = 'expire-stale-places' and schedule = '30 4 * * *'),
  'il job expire-stale-places è registrato');

-- ------------------------------------------------------------ import_typical_manual
select google_place_id as pid_a from venues where name = 'Attivo' \gset
select id as vid_a from venues where google_place_id = :'pid_a' \gset
select tests.make_venue('Altro locale') as vid_b \gset
insert into venue_typical_busyness (venue_id, weekday, hour, level, source) values
  (:'vid_b', 1, 1, 2, 'manual'), (:'vid_a', 3, 3, 1, 'history'), (:'vid_a', 3, 3, 3, 'manual');

set local role service_role;
select venues as n_venues, cells as n_cells from public.import_typical_manual('milano', jsonb_build_array(
  jsonb_build_object('google_place_id', :'pid_a', 'weekday', 5, 'hour', 23, 'level', 3),
  jsonb_build_object('google_place_id', :'pid_a', 'weekday', 6, 'hour', 0, 'level', 3))) \gset
reset role;
select is(array[:n_venues, :n_cells], array[1, 2], 'import: 1 locale, 2 celle');
select is((select count(*)::int from venue_typical_busyness where venue_id = :'vid_a' and source = 'manual'), 2,
  'le vecchie righe manual del locale sono sostituite');
select is((select level from venue_typical_busyness where venue_id = :'vid_a' and source = 'history'), 1::smallint,
  'le righe history non sono toccate');
select is((select count(*)::int from venue_typical_busyness where venue_id = :'vid_b' and source = 'manual'), 1,
  'i locali non presenti nell''import non sono toccati');

create temp table before_state as select * from venue_typical_busyness where venue_id = :'vid_a';
set local role service_role;
select venues, cells from public.import_typical_manual('milano', jsonb_build_array(
  jsonb_build_object('google_place_id', :'pid_a', 'weekday', 5, 'hour', 23, 'level', 3),
  jsonb_build_object('google_place_id', :'pid_a', 'weekday', 6, 'hour', 0, 'level', 3)));
reset role;
select is((select count(*)::int from (
  (select venue_id, weekday, hour, level, source from before_state except
   select venue_id, weekday, hour, level, source from venue_typical_busyness where venue_id = :'vid_a')
  union all
  (select venue_id, weekday, hour, level, source from venue_typical_busyness where venue_id = :'vid_a' except
   select venue_id, weekday, hour, level, source from before_state)) d), 0,
  'due import uguali lasciano lo stesso stato (idempotente)');

set local role service_role;
select throws_ok(format($$ select * from public.import_typical_manual('milano', '[
  {"google_place_id": "%s", "weekday": 0, "hour": 0, "level": 1},
  {"google_place_id": "demo-lp-01", "weekday": 0, "hour": 0, "level": 1}]'::jsonb) $$, :'pid_a'),
  'UNKNOWN_VENUE', 'un place_id di un''altra città è rifiutato');
select throws_ok($$ select * from public.import_typical_manual('milano', '[
  {"google_place_id": "non-esiste", "weekday": 0, "hour": 0, "level": 1}]'::jsonb) $$,
  'UNKNOWN_VENUE', 'un place_id sconosciuto è rifiutato');
select throws_ok(format($$ select * from public.import_typical_manual('milano', '[
  {"google_place_id": "%s", "weekday": 0, "hour": 0, "level": 4}]'::jsonb) $$, :'pid_a'),
  'INVALID_ARGUMENT', 'un livello fuori range è rifiutato');
select throws_ok($$ select * from public.import_typical_manual('atlantide', '[]'::jsonb) $$, 'NOT_FOUND',
  'città sconosciuta → NOT_FOUND');
reset role;
select is((select count(*)::int from venue_typical_busyness where venue_id = :'vid_a' and source = 'manual'), 2,
  'dopo gli errori nessuna scrittura parziale');

select * from finish();
rollback;
