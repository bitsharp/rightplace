begin;
\ir helpers/setup.psql
select plan(11);

select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.blu') as b \gset

select has_function('public', 'set_profile_city', array['text'], 'set_profile_city esiste');
select is((select city_id from profiles where id = :'a'), (select id from cities where slug = 'milano'),
  'partenza: la città del profilo è Milano');

select tests.authenticate_as(:'a');
select lives_ok($$ select set_profile_city('las-palmas') $$, 'una città attiva si può scegliere');
select is((select c.slug from profiles p join cities c on c.id = p.city_id where p.id = auth.uid()), 'las-palmas',
  'la città del profilo è aggiornata');
select lives_ok($$ select set_profile_city('las-palmas') $$, 'idempotente: la stessa città due volte non fa errori');

-- only the caller's row changes
reset role;
select is((select c.slug from profiles p join cities c on c.id = p.city_id where p.id = :'b'), 'milano',
  'gli altri profili non cambiano');

-- nothing else on the caller's row changes
create temp table before_row as
  select handle, birth_date, gender, locale, location_opt_in, contacts_opt_in, is_creator, handle_changed_at
    from profiles where id = :'a';
select tests.authenticate_as(:'a');
select set_profile_city('milano');
reset role;
select is(
  (select row(handle, birth_date, gender, locale, location_opt_in, contacts_opt_in, is_creator, handle_changed_at)
     from profiles where id = :'a'),
  (select row(handle, birth_date, gender, locale, location_opt_in, contacts_opt_in, is_creator, handle_changed_at)
     from before_row),
  'cambia solo city_id');

-- inactive / unknown city
select tests.authenticate_as(:'a');
select throws_ok($$ select set_profile_city('madrid') $$, 'CITY_NOT_ACTIVE', 'una città non attiva è rifiutata');
select throws_ok($$ select set_profile_city('atlantide') $$, 'CITY_NOT_ACTIVE', 'una città inesistente è rifiutata');

-- anon cannot run it, and nobody can call it without a user
reset role;
select ok(
  not has_function_privilege('anon', 'public.set_profile_city(text)', 'execute')
  and has_function_privilege('authenticated', 'public.set_profile_city(text)', 'execute'),
  'anon non esegue, authenticated sì');
select set_config('request.jwt.claims', '{}', true);
select throws_ok($$ select set_profile_city('milano') $$, 'NOT_AUTHENTICATED', 'senza utente è rifiutata');

select * from finish();
rollback;
