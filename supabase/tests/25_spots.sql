begin;
\ir helpers/setup.psql
select plan(116);

select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola') as b \gset
select tests.create_user('gufo.verde') as c \gset
select tests.create_user('orso.blu') as d \gset
select tests.create_user('lupo.nero') as e \gset
select tests.create_user('gatto.giallo') as f \gset
select tests.make_venue('Locale normale') as v_normal \gset

-- ------------------------------------------------------------ schema
select has_column('public', 'venues', 'source', 'venues.source esiste');
select has_column('public', 'venues', 'created_by', 'venues.created_by esiste');
select has_column('public', 'venues', 'spot_expires_at', 'venues.spot_expires_at esiste');
select has_column('public', 'venues', 'hidden_at', 'venues.hidden_at esiste');
select is((select count(*)::int from venues where source <> 'places' and google_place_id like 'demo-%'), 0,
  'i locali esistenti restano source=places');
select throws_ok($$ insert into venues (city_id, google_place_id, name, kind, source, location)
  values ((select id from cities where slug = 'milano'), 'x-1', 'Bar', 'bar', 'user',
          extensions.st_setsrid(extensions.st_makepoint(9.19, 45.46), 4326)::extensions.geography) $$,
  '23514', null, 'source=user ammette solo kind=spot');
select throws_ok($$ insert into venues (city_id, google_place_id, name, kind, source, location)
  values ((select id from cities where slug = 'milano'), 'x-2', 'Bar', 'bar', 'altro',
          extensions.st_setsrid(extensions.st_makepoint(9.19, 45.46), 4326)::extensions.geography) $$,
  '23514', null, 'source ammette solo places e user');

-- ------------------------------------------------------------ city_for_point
select is(private.city_for_point(45.4642, 9.19), (select id from cities where slug = 'milano'),
  'city_for_point: il centro di Milano è Milano');
select is(private.city_for_point(46.5, 9.19), null::uuid, 'city_for_point: fuori dal raggio → null');
select is(private.city_for_point(40.4168, -3.7038), null::uuid, 'city_for_point: una città non attiva non conta');

-- ------------------------------------------------------------ declare_at_spot: validation
reset role;
select tests.authenticate_as(:'b');
select throws_ok($$ select * from declare_at_spot(45.4642, 9.19, 'ab', 'going') $$, 'INVALID_SPOT_NAME', 'nome di 2 caratteri rifiutato');
select throws_ok($$ select * from declare_at_spot(45.4642, 9.19, '  ab  ', 'going') $$, 'INVALID_SPOT_NAME', 'il nome è tagliato prima del controllo');
select throws_ok(format($$ select * from declare_at_spot(45.4642, 9.19, %L, 'going') $$, repeat('x', 41)), 'INVALID_SPOT_NAME', 'nome di 41 caratteri rifiutato');
select throws_ok($$ select * from declare_at_spot(45.4642, 9.19, '@mario party', 'going') $$, 'INVALID_SPOT_NAME', 'niente @ nel nome');
select throws_ok($$ select * from declare_at_spot(45.4642, 9.19, 'vieni su http://x.it', 'going') $$, 'INVALID_SPOT_NAME', 'niente URL con schema');
select throws_ok($$ select * from declare_at_spot(45.4642, 9.19, 'vai su www.sito', 'going') $$, 'INVALID_SPOT_NAME', 'niente www.');
select throws_ok($$ select * from declare_at_spot(45.4642, 9.19, 'sito.COM', 'going') $$, 'INVALID_SPOT_NAME', 'niente domini nudi');
select throws_ok($$ select * from declare_at_spot(45.4642, 9.19, 'casa a.it/x', 'going') $$, 'INVALID_SPOT_NAME', 'niente domini con percorso');
select throws_ok($$ select * from declare_at_spot(45.4642, 9.19, null, 'going') $$, 'INVALID_SPOT_NAME', 'nome nullo rifiutato');
select throws_ok($$ select * from declare_at_spot(45.4642, 9.19, 'Casa di Anna', 'boh') $$, 'INVALID_INTENT', 'intento non valido');
select throws_ok($$ select * from declare_at_spot(46.5, 9.19, 'Casa di Anna', 'going') $$, 'OUT_OF_CITY', 'punto fuori da ogni città → OUT_OF_CITY');
select throws_ok($$ select * from declare_at_spot(40.4168, -3.7038, 'Casa di Anna', 'going') $$, 'OUT_OF_CITY', 'città non attiva → OUT_OF_CITY');
select throws_ok($$ select * from declare_at_spot(95, 9.19, 'Casa di Anna', 'going') $$, 'INVALID_ARGUMENT', 'latitudine impossibile → INVALID_ARGUMENT');
reset role;
select is((select count(*)::int from venues where kind = 'spot'), 0, 'nessuno spot creato dai tentativi falliti');

-- ------------------------------------------------------------ declare_at_spot: happy path
select tests.make_declaration(:'a', :'v_normal', 'maybe');  -- a previous plan, replaced by the spot
reset role;
select tests.authenticate_as(:'a');
select venue_id as spot, declaration_id as decl from declare_at_spot(45.46421234, 9.19006789, '  Casa di Anna  ', 'going') \gset
reset role;
select is((select kind || '/' || source from venues where id = :'spot'), 'spot/user', 'lo spot è kind=spot source=user');
select is((select name from venues where id = :'spot'), 'Casa di Anna', 'il nome è salvato senza spazi');
select is((select created_by from venues where id = :'spot'), :'a'::uuid, 'created_by è chi lo ha creato (solo dentro il DB)');
select is((select extensions.st_y(location::extensions.geometry) from venues where id = :'spot'), 45.4642::double precision,
  'latitudine arrotondata a 4 decimali');
select is((select extensions.st_x(location::extensions.geometry) from venues where id = :'spot'), 9.1901::double precision,
  'longitudine arrotondata a 4 decimali');
select is((select spot_expires_at from venues where id = :'spot'),
  public.night_end(public.current_night_date((select id from cities where slug = 'milano')), 'Europe/Rome'),
  'lo spot scade alle 06:00 locali di fine night');
select is((select city_id from venues where id = :'spot'), (select id from cities where slug = 'milano'), 'lo spot sta nella città del punto');
select ok((select is_active and places_synced_at is null from venues where id = :'spot'), 'attivo e fuori dalla sync Places');
select is((select count(*)::int from declarations where user_id = :'a' and expires_at > now()), 1,
  'una sola dichiarazione attiva: lo spot sostituisce il piano precedente');
select is((select intent from declarations where id = :'decl'), 'going', 'la dichiarazione è "going"');
select is((select count(*)::int from chat_rooms r join nights n on n.id = r.night_id where n.venue_id = :'spot'), 1,
  'nasce la chat della serata come per ogni venue');
reset role;
select tests.authenticate_as(:'a');
select is((select venue_name from get_my_declaration()), 'Casa di Anna', 'la mia dichiarazione compare come lo spot');

-- same name + same point from the same user re-uses the spot (change of mind), anything else is the limit
select is((select venue_id from declare_at_spot(45.4642, 9.1901, 'casa di anna', 'maybe')), :'spot'::uuid,
  'stesso nome e punto → lo stesso spot, intento aggiornato');
reset role;
select is((select intent from declarations where id = :'decl'), 'maybe', 'l''intento è cambiato');
reset role;
select tests.authenticate_as(:'a');
select throws_ok($$ select * from declare_at_spot(45.4700, 9.2000, 'Altro posto', 'going') $$, 'SPOT_LIMIT',
  'secondo spot nella stessa notte → SPOT_LIMIT');
select throws_ok($$ select * from declare_at_spot(45.4642, 9.1901, 'Altro nome', 'going') $$, 'SPOT_LIMIT',
  'stesso punto ma nome diverso → SPOT_LIMIT');
select throws_ok($$ select * from declare_at_spot(45.4700, 9.2000, 'Casa di Anna', 'going') $$, 'SPOT_LIMIT',
  'stesso nome ma punto diverso → SPOT_LIMIT');
reset role;
select is((select count(*)::int from venues where created_by = :'a'), 1, 'un solo spot per utente per night');

-- ------------------------------------------------------------ privacy: created_by / hidden_at never leave
select is(
  (select array_agg(p.proname || '.' || arg order by p.proname) from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace,
     unnest(coalesce(p.proargnames, '{}')) with ordinality a(arg, i)
   where n.nspname = 'public'
     and p.proargmodes is not null and p.proargmodes[i] in ('o', 't')
     and arg ~* '(created_by|hidden_at|creator_of)'),
  null, 'nessuna RPC restituisce created_by o hidden_at');
reset role;
select tests.authenticate_as(:'b');
select throws_ok($$ select created_by from venues $$, '42501', null, 'created_by non è leggibile con select diretta');
select throws_ok($$ select hidden_at from venues $$, '42501', null, 'hidden_at non è leggibile con select diretta');
select throws_ok($$ select * from venues $$, '42501', null, 'select * su venues è negata (colonne con grant esplicito)');
select lives_ok($$ select id, name, kind, address, google_place_id, is_active from venues $$, 'le colonne del catalogo restano leggibili');
select is((select count(*)::int from venues where kind = 'spot'), 0, 'gli spot non sono leggibili con select diretta (solo via RPC con k)');
select is((select count(*)::int from search_venues('milano') where kind = 'spot'), 0, 'gli spot non compaiono nella ricerca del catalogo');

-- ------------------------------------------------------------ map: below k no numbers, from 3 a band
create temp table spot_map as select * from get_city_map('milano', 'general');
select is((select count(*)::int from spot_map where venue_id = :'spot'), 1, 'con 1 dichiarazione lo spot è sulla mappa');
select is((select name from spot_map where venue_id = :'spot'), 'Casa di Anna', 'con il nome scelto');
select ok((select going_band is null and maybe_band is null from spot_map where venue_id = :'spot'),
  'sotto k=3 le fasce sono null (non "pochi")');
select ok((select not is_hot_spot and is_spot and is_declarable and typical_level = 0 from spot_map where venue_id = :'spot'),
  'sotto k è uno spot dichiarabile: non hot spot, typical_level 0');
drop table spot_map;
select ok((select going_band is null and maybe_band is null from get_venue_stats(:'spot')),
  'get_venue_stats: sotto k nessuna fascia');
select is((select name from get_venue_detail(:'spot')), 'Casa di Anna', 'get_venue_detail funziona per uno spot');
select is((select kind from get_venue_detail(:'spot')), 'spot', 'e dice che è uno spot');

-- a second declaration is still below k
reset role;
select tests.authenticate_as(:'c');
select declare('going', :'spot');
reset role;
select tests.authenticate_as(:'b');
select ok((select going_band is null and maybe_band is null and not is_hot_spot from get_city_map('milano') where venue_id = :'spot'),
  'con 2 dichiarazioni ancora nessun numero');

-- the third makes it a normal hot spot
reset role;
select tests.authenticate_as(:'d');
select declare('going', :'spot');
reset role;
select tests.authenticate_as(:'b');
select is((select going_band from get_city_map('milano') where venue_id = :'spot'), 'pochi',
  'a 3 dichiarazioni (1 maybe, 2 going) le bande seguono la regola dei locali');
reset role;
update declarations set intent = 'going' where user_id = :'a';
reset role;
select tests.authenticate_as(:'b');
select is((select going_band from get_city_map('milano') where venue_id = :'spot'), '3–10', 'a 3 going compare la fascia 3–10');
select ok((select is_hot_spot and is_spot from get_city_map('milano') where venue_id = :'spot'), 'ed è un hot spot normale');
select is((select going_band from get_venue_stats(:'spot')), '3–10', 'get_venue_stats mostra la fascia da 3');

-- ------------------------------------------------------------ hidden / expired spots
-- reports: 3 distinct reporters hide the spot
reset role;
select tests.authenticate_as(:'b');
select throws_ok(format($$ select report('spot', %L) $$, :'v_normal'), 'INVALID_ARGUMENT', 'report spot accetta solo venue kind=spot');
select throws_ok($$ select report('spot', gen_random_uuid()) $$, 'INVALID_ARGUMENT', 'report spot su id inesistente → INVALID_ARGUMENT');
select lives_ok(format($$ select report('spot', %L, 'nome offensivo') $$, :'spot'), 'segnalare uno spot è ammesso');
select report('spot', :'spot');
select report('spot', :'spot');
reset role;
select is((select hidden_at from venues where id = :'spot'), null, 'lo stesso utente 3 volte non nasconde lo spot');
reset role;
select tests.authenticate_as(:'e');
select report('spot', :'spot');
reset role;
select is((select hidden_at from venues where id = :'spot'), null, '2 segnalatori distinti non bastano');
reset role;
select tests.authenticate_as(:'f');
select report('spot', :'spot');
reset role;
select ok((select hidden_at is not null from venues where id = :'spot'), '3 segnalatori distinti nascondono lo spot');
select is((select count(*)::int from declarations where night_id in (select id from nights where venue_id = :'spot')), 3,
  'le dichiarazioni esistenti restano');
reset role;
select tests.authenticate_as(:'b');
select is((select count(*)::int from get_city_map('milano') where venue_id = :'spot'), 0, 'lo spot nascosto sparisce dalla mappa');
select throws_ok(format($$ select declare('going', %L) $$, :'spot'), 'VENUE_NOT_ACTIVE',
  'non si può più dichiarare uno spot nascosto');
reset role;
select tests.authenticate_as(:'a');
select is((select venue_name from get_my_declaration()), 'Casa di Anna', 'chi aveva dichiarato la vede ancora');

-- expiry (06:00): gone from the map, not physically deleted while the chat lives
reset role;
insert into venues (city_id, google_place_id, name, kind, source, created_by, spot_expires_at, location)
select c.id, 'spot:' || gen_random_uuid(), 'Spot scaduto', 'spot', 'user', :'e', now() - interval '1 hour',
       extensions.st_setsrid(extensions.st_makepoint(9.2, 45.47), 4326)::extensions.geography
  from cities c where c.slug = 'milano' returning id as s_exp \gset
select tests.make_declaration(:'e', :'s_exp', 'going');
reset role;
select tests.authenticate_as(:'b');
select is((select count(*)::int from get_city_map('milano') where venue_id = :'s_exp'), 0, 'dopo spot_expires_at lo spot sparisce dalla mappa');
select throws_ok(format($$ select declare('going', %L) $$, :'s_exp'), 'VENUE_NOT_ACTIVE', 'e non è più dichiarabile');
reset role;
select private.purge_expired_spots();
select is((select count(*)::int from venues where id = :'s_exp'), 1, 'scaduto da 1 ora: non cancellato (la chat è viva)');

update venues set spot_expires_at = now() - interval '2 days 1 hour' where id = :'s_exp';
select private.purge_expired_spots();
select is((select count(*)::int from venues where id = :'s_exp'), 1, '+2 giorni ma chat ancora viva: non cancellato');
update chat_rooms set expires_at = now() - interval '1 hour' where night_id in (select id from nights where venue_id = :'s_exp');
select private.purge_expired_spots();
select is((select count(*)::int from venues where id = :'s_exp'), 0, 'scaduto da oltre 2 giorni e senza chat viva: cancellato');
select is((select count(*)::int from venues where id = :'spot'), 1, 'gli altri spot non sono toccati');
select is((select count(*)::int from venues where id = :'v_normal'), 1, 'i locali normali non sono toccati');

-- ------------------------------------------------------------ declare_at_place
reset role;
select tests.authenticate_as(:'b');
select throws_ok($$ select declare_at_place('ChIJnon-in-cache', 'going') $$, 'PLACE_NOT_CACHED', 'senza cache → PLACE_NOT_CACHED');
select throws_ok(format($$ select declare_at_place((select google_place_id from venues where id = %L), 'boh') $$, :'v_normal'),
  'INVALID_INTENT', 'intento non valido');
select is(declare_at_place((select google_place_id from venues where id = :'v_normal'), 'going'), :'v_normal'::uuid,
  'con il locale in cache dichiara e restituisce venue_id');
select is((select intent from get_my_declaration()), 'going', 'la dichiarazione esiste');
reset role;
update venues set is_active = false where id = :'v_normal';
reset role;
select tests.authenticate_as(:'c');
select throws_ok(format($$ select declare_at_place((select google_place_id from venues where id = %L), 'going') $$, :'v_normal'),
  'PLACE_NOT_CACHED', 'locale non attivo → PLACE_NOT_CACHED');
reset role;

-- ------------------------------------------------------------ upsert_search_place
select upsert_search_place('milano', jsonb_build_object('google_place_id', 'ChIJaddr1', 'name', 'Via Torino 20',
  'kind', 'other', 'lat', 45.4642, 'lng', 9.19, 'address', 'Via Torino 20, 20123 Milano MI, Italia',
  'types', jsonb_build_array('street_address'))) as p_addr \gset
select is((select kind || '/' || source || '/' || name from venues where id = :'p_addr'),
  'spot/places/Via Torino 20, 20123 Milano MI, Italia', 'un indirizzo diventa uno spot source=places con nome = indirizzo');
select is((select spot_expires_at from venues where id = :'p_addr'), null, 'lo spot-indirizzo non ha scadenza');
select ok((select created_by is null and is_active and places_synced_at is not null from venues where id = :'p_addr'),
  'senza created_by, attivo, con places_synced_at');
select upsert_search_place('milano', jsonb_build_object('google_place_id', 'ChIJclub1', 'name', 'Magazzini Generali',
  'kind', 'club', 'lat', 45.4500, 'lng', 9.2000, 'address', 'Via Pietrasanta 14, Milano',
  'types', jsonb_build_array('night_club', 'establishment', 'point_of_interest'))) as p_club \gset
select is((select kind || '/' || source || '/' || name from venues where id = :'p_club'), 'club/places/Magazzini Generali',
  'un esercizio è un venue normale con il kind passato');
update venues set opening_hours = '{"weekdayDescriptions":["x"]}'::jsonb where id = :'p_club';
select is(upsert_search_place('milano', jsonb_build_object('google_place_id', 'ChIJclub1', 'name', 'Magazzini Generali 2',
  'kind', 'club', 'lat', 45.4500, 'lng', 9.2000, 'address', 'Via Pietrasanta 14, Milano',
  'opening_hours', '{"weekdayDescriptions":["y"]}'::jsonb, 'types', jsonb_build_array('night_club', 'establishment'))), :'p_club'::uuid,
  'un secondo upsert aggiorna la stessa riga');
select is((select opening_hours->'weekdayDescriptions'->>0 from venues where id = :'p_club'), 'x', 'gli orari esistenti non sono sovrascritti');
select is((select name from venues where id = :'p_club'), 'Magazzini Generali 2', 'ma il nome sì');
select throws_ok($$ select upsert_search_place('milano', jsonb_build_object('google_place_id', 'ChIJfar', 'name', 'Lontano',
  'kind', 'bar', 'lat', 46.5, 'lng', 9.19, 'types', jsonb_build_array('establishment'))) $$, 'OUT_OF_CITY',
  'un punto fuori dalla città indicata è rifiutato');
select throws_ok($$ select upsert_search_place('atlantide', '{}'::jsonb) $$, 'NOT_FOUND', 'città sconosciuta → NOT_FOUND');
select throws_ok($$ select upsert_search_place('milano', jsonb_build_object('name', 'Senza id', 'lat', 45.46, 'lng', 9.19)) $$,
  'INVALID_ARGUMENT', 'riga senza google_place_id → INVALID_ARGUMENT');
select throws_ok($$ select upsert_search_place('milano', jsonb_build_object('google_place_id', 'spot:abc', 'name', 'Falso',
  'lat', 45.46, 'lng', 9.19, 'types', jsonb_build_array('establishment'))) $$, 'INVALID_ARGUMENT',
  'un place_id sintetico "spot:" non è accettato');

-- a Google address spot behaves like a declarable spot: invisible without declarations, k below 3 hides numbers
reset role;
select tests.authenticate_as(:'b');
select is((select count(*)::int from get_city_map('milano') where venue_id = :'p_addr'), 0, 'uno spot-indirizzo senza dichiarazioni non compare');
select is(declare_at_place('ChIJaddr1', 'going'), :'p_addr'::uuid, 'dichiarare un indirizzo scelto da Google');
select ok((select going_band is null and is_spot and not is_hot_spot from get_city_map('milano') where venue_id = :'p_addr'),
  'poi compare come spot senza numeri');
reset role;
update venues set hidden_at = now() where id = :'p_addr';
reset role;
select tests.authenticate_as(:'c');
select throws_ok($$ select declare_at_place('ChIJaddr1', 'going') $$, 'PLACE_NOT_CACHED', 'uno spot-indirizzo nascosto non è dichiarabile');
reset role;

-- stale Places data is wiped for places-spots but never for user spots
update venues set places_synced_at = now() - interval '40 days', hidden_at = null where id = :'p_addr';
select private.expire_stale_places();
select ok((select location is null and not is_active from venues where id = :'p_addr'), 'expire_stale_places azzera anche gli spot-indirizzo');
select ok((select is_active and location is not null from venues where id = :'spot'), 'ma non tocca gli spot degli utenti');

-- ------------------------------------------------------------ search session quota (server-side: new token = new session)
select is((select count(*)::int from generate_series(1, 30) g where consume_places_search_session(:'a', gen_random_uuid())), 30,
  'le prime 30 sessioni (token nuovi) delle ultime 24 ore sono consumate');
select is(consume_places_search_session(:'a', gen_random_uuid()), false, 'la 31ª sessione nuova è rifiutata');
select gen_random_uuid() as known_token \gset
select consume_places_search_session(:'b', :'known_token');
select is(consume_places_search_session(:'b', :'known_token'), true, 'lo stesso token è la stessa sessione: ok senza consumare');
select is((select count(*)::int from private.places_search_sessions where user_id = :'b'), 1, 'e non crea una seconda riga');
select is(consume_places_search_session(:'c', gen_random_uuid()), true, 'la quota è per utente');
insert into private.places_search_sessions (user_id, session_token, created_at)
select :'f', gen_random_uuid(), now() - interval '30 hours' from generate_series(1, 40);
select is(consume_places_search_session(:'f', gen_random_uuid()), true, 'le sessioni più vecchie di 24 ore non contano nel limite');
select is((select count(*)::int from private.places_search_sessions where user_id = :'a'), 30,
  'un token rifiutato non lascia righe: il limite resta 30');
insert into private.places_search_sessions (user_id, session_token, created_at)
values (:'e', gen_random_uuid(), now() - interval '3 days'), (:'e', gen_random_uuid(), now() - interval '1 day');
select private.purge_places_search_usage();
select is((select count(*)::int from private.places_search_sessions where user_id = :'e'), 1, 'la pulizia toglie le sessioni oltre 2 giorni');
select is((select count(*)::int from private.places_search_sessions where user_id = :'a'), 30, 'e tiene quelle recenti');

-- ------------------------------------------------------------ privileges
reset role;
select tests.authenticate_as(:'a');
select throws_ok($$ select upsert_search_place('milano', '{}'::jsonb) $$, '42501', null, 'authenticated non esegue upsert_search_place');
select throws_ok($$ select consume_places_search_session(gen_random_uuid(), gen_random_uuid()) $$, '42501', null, 'authenticated non esegue consume_places_search_session');
select throws_ok($$ select private.purge_expired_spots() $$, '42501', null, 'un client non esegue purge_expired_spots');
select throws_ok($$ select private.city_for_point(45.4, 9.19) $$, '42501', null, 'un client non esegue city_for_point');
reset role;
select ok(
  not has_function_privilege('anon', 'public.declare_at_spot(double precision, double precision, text, text)', 'execute')
  and not has_function_privilege('anon', 'public.declare_at_place(text, text)', 'execute')
  and not has_function_privilege('anon', 'public.upsert_search_place(text, jsonb)', 'execute')
  and not has_function_privilege('anon', 'public.consume_places_search_session(uuid, uuid)', 'execute')
  and not has_function_privilege('anon', 'public.get_city_map(text, text)', 'execute'),
  'anon non esegue nulla di nuovo');
select ok(
  has_function_privilege('authenticated', 'public.declare_at_spot(double precision, double precision, text, text)', 'execute')
  and has_function_privilege('authenticated', 'public.declare_at_place(text, text)', 'execute')
  and has_function_privilege('service_role', 'public.upsert_search_place(text, jsonb)', 'execute')
  and has_function_privilege('service_role', 'public.consume_places_search_session(uuid, uuid)', 'execute')
  and not has_function_privilege('authenticated', 'public.upsert_search_place(text, jsonb)', 'execute')
  and not has_function_privilege('authenticated', 'public.consume_places_search_session(uuid, uuid)', 'execute'),
  'declare_* per authenticated, le due funzioni di servizio solo per service_role');
select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('declare_at_spot', 'declare_at_place', 'upsert_search_place',
      'consume_places_search_session') and obj_description(p.oid, 'pg_proc') is null),
  null, 'ogni nuova RPC ha COMMENT ON FUNCTION');

select * from finish();
rollback;
