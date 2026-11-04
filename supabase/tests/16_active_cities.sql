begin;
\ir helpers/setup.psql
select plan(8);

select tests.create_user('lince.rosso') as me \gset

select tests.authenticate_as(:'me');
create temp table active as select * from get_active_cities();

select ok((select count(*) from active where slug = 'milano') = 1, 'elenca Milano');
select ok((select count(*) from active where slug = 'las-palmas') = 1, 'elenca Las Palmas');
select is((select round(lat::numeric, 4) from active where slug = 'milano'), 45.4642, 'latitudine del centro dal seed');
select is((select round(lng::numeric, 4) from active where slug = 'milano'), 9.1900, 'longitudine del centro dal seed');
select is((select default_zoom from active where slug = 'milano'), 13::smallint, 'zoom predefinito');
select is((select count(*)::int from active where slug in ('madrid', 'barcelona')), 0, 'le città inattive non compaiono');
select is((select array_agg(name) from get_active_cities()), (select array_agg(name order by name) from active),
  'ordinate per nome');

reset role;
set local role anon;
select throws_ok($$ select * from get_active_cities() $$, '42501', null, 'anon non può eseguire la funzione');

select * from finish();
rollback;
