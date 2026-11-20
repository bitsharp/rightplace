begin;
\ir helpers/setup.psql
select plan(19);

select tests.make_venue('Locale A') as va \gset
select tests.make_venue('Locale Punto', 'spot') as vs \gset
select google_place_id as pid_a from venues where id = :'va' \gset
select google_place_id as pid_s from venues where id = :'vs' \gset
select tests.create_user('lince.rosso') as u \gset

-- schema ---------------------------------------------------------------------------------------------------------
select has_column('public', 'venues', 'website_uri', 'venues.website_uri esiste');
select has_column('public', 'venues', 'details_synced_at', 'venues.details_synced_at esiste');
select tests.authenticate_as(:'u');
select throws_ok($$ select website_uri from public.venues $$, '42501', null,
  'i client non leggono website_uri direttamente');
select throws_ok($$ select details_synced_at from public.venues $$, '42501', null,
  'i client non leggono details_synced_at direttamente');
reset role;

-- set_venue_details ------------------------------------------------------------------------------------------------
set local role service_role;
select public.set_venue_details(:'pid_a', 'https://www.locale.it/') as ok_a \gset
reset role;
select is(:'ok_a'::boolean, true, 'salva il sito di un locale attivo');
select is((select website_uri from venues where id = :'va'), 'https://www.locale.it/', 'website_uri salvato');
select ok((select details_synced_at from venues where id = :'va') > now() - interval '1 minute', 'details_synced_at aggiornato');

set local role service_role;
select public.set_venue_details(:'pid_a', null) as ok_null \gset
reset role;
select is((select website_uri is null and details_synced_at is not null from venues where id = :'va'), true,
  'sito assente: azzera website_uri ma segna la Details come eseguita');

set local role service_role;
select throws_ok(format($$ select public.set_venue_details(%L, 'javascript:alert(1)') $$, :'pid_a'),
  'INVALID_ARGUMENT', 'uno schema diverso da http/https è rifiutato');
select throws_ok(format($$ select public.set_venue_details(%L, %L) $$, :'pid_a', 'https://x.it/' || repeat('a', 2100)),
  'INVALID_ARGUMENT', 'un URL troppo lungo è rifiutato');
select is(public.set_venue_details('non-esiste', 'https://x.it/'), false, 'venue sconosciuto: false, nessun errore');
select is(public.set_venue_details(:'pid_s', 'https://x.it/'), false, 'uno spot non ha sito: false');
reset role;

-- privileges -------------------------------------------------------------------------------------------------------
select tests.authenticate_as(:'u');
select throws_ok($$ select public.set_venue_details('x', null) $$, '42501', null,
  'un client authenticated non esegue set_venue_details');
reset role;
select ok(not has_function_privilege('anon', 'public.set_venue_details(text, text)', 'execute')
      and not has_function_privilege('authenticated', 'public.set_venue_details(text, text)', 'execute')
      and has_function_privilege('service_role', 'public.set_venue_details(text, text)', 'execute'),
  'set_venue_details è solo per service_role');

-- get_venue_detail --------------------------------------------------------------------------------------------------
update venues set website_uri = 'https://www.locale.it/' where id = :'va';
select tests.authenticate_as(:'u');
select is((select website_uri from get_venue_detail(:'va')), 'https://www.locale.it/', 'get_venue_detail restituisce il sito');
select is((select photo_url from get_venue_detail(:'va')), null, 'le colonne precedenti restano (photo_url in coda)');
reset role;
update venues set website_uri = null where id = :'va';
select tests.authenticate_as(:'u');
select is((select website_uri from get_venue_detail(:'va')), null, 'senza sito: null');
reset role;

-- 30-day Places rule: the website goes away with the other Places content ----------------------------------------------
update venues set website_uri = 'https://www.locale.it/', details_synced_at = now() - interval '40 days',
       places_synced_at = now() - interval '40 days' where id = :'va';
select private.expire_stale_places();
select is((select website_uri is null and details_synced_at is null and not is_active from venues where id = :'va'), true,
  'expire_stale_places azzera sito e data della Details insieme agli altri contenuti Places');
select tests.make_venue('Locale Fresco') as vf \gset
update venues set website_uri = 'https://www.fresco.it/', details_synced_at = now(), places_synced_at = now() where id = :'vf';
select private.expire_stale_places();
select is((select website_uri from venues where id = :'vf'), 'https://www.fresco.it/', 'un locale fresco tiene il sito');

select * from finish();
rollback;
