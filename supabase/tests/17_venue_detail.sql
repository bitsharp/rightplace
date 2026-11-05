begin;
\ir helpers/setup.psql
select plan(13);

select tests.create_user('lince.rosso') as me \gset
select tests.make_venue('Club Detail') as milan \gset
select tests.make_venue('Bar Canarias', 'bar', 'las-palmas') as canary \gset
insert into public.cities (slug, name, country, center, default_zoom, timezone, is_active)
values ('test-city', 'Test City', 'FR', extensions.st_setsrid(extensions.st_makepoint(2.35, 48.85), 4326)::extensions.geography,
        13, 'Europe/Paris', true);
select tests.make_venue('Bar Senza Taxi', 'bar', 'test-city') as no_taxi \gset
select tests.make_venue('Club Chiuso') as closed \gset
update public.venues set is_active = false where id = :'closed';
update public.venues set address = 'Via Test 1', opening_hours = '{"periods": []}'::jsonb where id = :'milan';
select tests.make_venue('Bar Madrid', 'bar', 'madrid') as inactive_city \gset

select tests.authenticate_as(:'me');

create temp table milan_detail as select * from get_venue_detail(:'milan');
select is((select count(*)::int from milan_detail), 1, 'restituisce una riga per il locale');
select is((select name from milan_detail), 'Club Detail', 'nome del locale');
select is((select address from milan_detail), 'Via Test 1', 'indirizzo');
select is((select opening_hours from milan_detail), '{"periods": []}'::jsonb, 'orari di apertura');
select is((select round(lat::numeric, 2) || ',' || round(lng::numeric, 2) from milan_detail), '45.46,9.19',
  'coordinate come numeri semplici (non EWKB)');
select is((select city_slug || '|' || timezone || '|' || country from milan_detail), 'milano|Europe/Rome|IT',
  'città, fuso e paese');
select is((select taxi_number from milan_detail), '+39 02 8585', 'numero taxi di Milano');
select is((select taxi_number from get_venue_detail(:'canary')), '+34 928 46 00 00', 'numero taxi di Las Palmas');
select is((select taxi_number from get_venue_detail(:'no_taxi')), null, 'una città senza numero taxi restituisce null');

select throws_ok(format($$ select * from get_venue_detail(%L) $$, :'closed'), 'P0001', 'NOT_FOUND', 'locale inattivo: NOT_FOUND');
select throws_ok(format($$ select * from get_venue_detail(%L) $$, :'inactive_city'), 'P0001', 'NOT_FOUND',
  'città non attiva: NOT_FOUND');

reset role;
set local role anon;
select throws_ok(format($$ select * from get_venue_detail(%L) $$, :'milan'), '42501', null, 'anon non può eseguire la funzione');
reset role;
select ok(obj_description('public.get_venue_detail(uuid)'::regprocedure, 'pg_proc') is not null,
  'ha COMMENT ON FUNCTION con la garanzia di privacy');

select * from finish();
rollback;
