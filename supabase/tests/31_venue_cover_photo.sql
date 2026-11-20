begin;
\ir helpers/setup.psql
select plan(24);

select tests.make_venue('Locale A') as va \gset
select tests.make_venue('Locale B') as vb \gset
select tests.make_venue('Locale Madrid', 'bar', 'madrid') as vm \gset
select google_place_id as pid_a from venues where id = :'va' \gset
select google_place_id as pid_b from venues where id = :'vb' \gset
select google_place_id as pid_m from venues where id = :'vm' \gset
select tests.create_user('lince.rosso') as u \gset

-- schema + kill switch -------------------------------------------------------------------------------------
select has_column('public', 'venues', 'photo_url', 'venues.photo_url esiste');
select has_column('public', 'venues', 'photo_fetched_at', 'venues.photo_fetched_at esiste');
select is((select enabled from private.feature_flags where name = 'venue_photo_apify'), true,
  'il flag venue_photo_apify è acceso di default');
select is(private.feature_enabled('venue_photo_apify'), true, 'feature_enabled legge il flag');
select is(private.feature_enabled('non_esiste'), false, 'un flag sconosciuto è spento');

-- clients never read the columns directly -------------------------------------------------------------------
select tests.authenticate_as(:'u');
select throws_ok($$ select photo_url from public.venues $$, '42501', null,
  'i client non leggono photo_url direttamente');
select throws_ok($$ select photo_fetched_at from public.venues $$, '42501', null,
  'i client non leggono photo_fetched_at direttamente');
reset role;

-- import_venue_photos_apify -----------------------------------------------------------------------------------
select tests.make_venue('Spento') as vi \gset
update venues set is_active = false where id = :'vi';
select google_place_id as pid_i from venues where id = :'vi' \gset
select tests.make_venue('Punto', 'spot') as vs \gset
select google_place_id as pid_s from venues where id = :'vs' \gset

set local role service_role;
select public.import_venue_photos_apify('milano', jsonb_build_array(
  jsonb_build_object('google_place_id', :'pid_a', 'image_url', 'https://lh3.googleusercontent.com/p/abc=w800'),
  jsonb_build_object('google_place_id', :'pid_b', 'image_url', 'https://googleusercontent.com/x.jpg'),
  jsonb_build_object('google_place_id', 'non-esiste', 'image_url', 'https://lh3.googleusercontent.com/p/zzz'),
  jsonb_build_object('google_place_id', :'pid_i', 'image_url', 'https://lh3.googleusercontent.com/p/i'),
  jsonb_build_object('google_place_id', :'pid_s', 'image_url', 'https://lh3.googleusercontent.com/p/s'),
  jsonb_build_object('google_place_id', :'pid_m', 'image_url', 'https://lh3.googleusercontent.com/p/m'))) as written \gset
reset role;
select is(:written, 2, 'scrive solo i venue attivi, non spot, della città');
select is((select photo_url from venues where id = :'va'), 'https://lh3.googleusercontent.com/p/abc=w800', 'photo_url salvato');
select ok((select photo_fetched_at from venues where id = :'va') > now() - interval '1 minute', 'photo_fetched_at aggiornato');
select is((select count(*)::int from venues where id in (:'vi', :'vs', :'vm') and photo_url is not null), 0,
  'venue spenti, spot e di altre città ignorati');

-- host allow-list ----------------------------------------------------------------------------------------------
set local role service_role;
select public.import_venue_photos_apify('milano', jsonb_build_array(
  jsonb_build_object('google_place_id', :'pid_a', 'image_url', 'http://lh3.googleusercontent.com/p/abc'))) as w_http \gset
select public.import_venue_photos_apify('milano', jsonb_build_array(
  jsonb_build_object('google_place_id', :'pid_a', 'image_url', 'https://evil.example.com/p/abc'),
  jsonb_build_object('google_place_id', :'pid_a', 'image_url', 'https://googleusercontent.com.evil.example.com/p/abc'),
  jsonb_build_object('google_place_id', :'pid_a', 'image_url', 'https://lh3.googleusercontent.com@evil.example.com/p/abc'),
  jsonb_build_object('google_place_id', :'pid_a', 'image_url', 'https://evil.example.com/?h=lh3.googleusercontent.com/'),
  jsonb_build_object('google_place_id', :'pid_a', 'image_url', 'https://notgoogleusercontent.com/p/abc'),
  jsonb_build_object('google_place_id', :'pid_a', 'image_url', 'javascript:alert(1)'),
  jsonb_build_object('google_place_id', :'pid_a', 'image_url', null))) as w_bad \gset
reset role;
select is(:w_http, 0, 'un URL http non è accettato');
select is(:w_bad, 0, 'host diversi da *.googleusercontent.com e URL malformati sono rifiutati');
select is((select photo_url from venues where id = :'va'), 'https://lh3.googleusercontent.com/p/abc=w800',
  'i rifiuti non sovrascrivono la foto esistente');

set local role service_role;
select throws_ok($$ select public.import_venue_photos_apify('milano', '{}'::jsonb) $$, 'INVALID_ARGUMENT',
  'payload non array → INVALID_ARGUMENT');
select throws_ok($$ select public.import_venue_photos_apify('atlantide', '[]'::jsonb) $$, 'NOT_FOUND',
  'città sconosciuta → NOT_FOUND');
reset role;

-- privileges -----------------------------------------------------------------------------------------------------
select tests.authenticate_as(:'u');
select throws_ok($$ select public.import_venue_photos_apify('milano', '[]'::jsonb) $$, '42501', null,
  'un client authenticated non esegue import_venue_photos_apify');
reset role;
select ok(not has_function_privilege('anon', 'public.import_venue_photos_apify(text, jsonb)', 'execute')
      and not has_function_privilege('authenticated', 'public.import_venue_photos_apify(text, jsonb)', 'execute')
      and has_function_privilege('service_role', 'public.import_venue_photos_apify(text, jsonb)', 'execute'),
  'import_venue_photos_apify è solo per service_role');

-- get_venue_detail: flag and freshness --------------------------------------------------------------------------
select tests.authenticate_as(:'u');
select is((select photo_url from get_venue_detail(:'va')), 'https://lh3.googleusercontent.com/p/abc=w800',
  'get_venue_detail restituisce la foto fresca');
reset role;
update venues set photo_fetched_at = now() - interval '61 days' where id = :'va';
select tests.authenticate_as(:'u');
select is((select photo_url from get_venue_detail(:'va')), null, 'una foto di 61 giorni non viene restituita');
reset role;
update venues set photo_fetched_at = now() - interval '59 days' where id = :'va';
select tests.authenticate_as(:'u');
select is((select photo_url from get_venue_detail(:'va')), 'https://lh3.googleusercontent.com/p/abc=w800',
  'una foto di 59 giorni viene restituita');
reset role;
update private.feature_flags set enabled = false where name = 'venue_photo_apify';
select tests.authenticate_as(:'u');
select is((select photo_url from get_venue_detail(:'va')), null, 'flag spento → photo_url null');
reset role;
update private.feature_flags set enabled = true where name = 'venue_photo_apify';

-- stale cleanup ----------------------------------------------------------------------------------------------------
update venues set photo_fetched_at = now() - interval '61 days' where id = :'va';
update venues set photo_url = 'https://lh3.googleusercontent.com/p/b', photo_fetched_at = now() - interval '10 days' where id = :'vb';
select private.purge_stale_venue_photos();
select is((select photo_url is null and photo_fetched_at is null from venues where id = :'va'), true,
  'il job azzera foto e data oltre i 60 giorni');
select is((select photo_url from venues where id = :'vb'), 'https://lh3.googleusercontent.com/p/b',
  'il job non tocca le foto recenti');

select * from finish();
rollback;
