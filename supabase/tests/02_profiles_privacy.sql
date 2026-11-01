begin;
\ir helpers/setup.psql
select plan(16);

select tests.create_user('lince.rosso', 25) as a \gset
select tests.create_user('volpe.viola', 31, 'male') as b \gset
update profiles set location_opt_in = true, coarse_location = coarsen(
  extensions.st_setsrid(extensions.st_makepoint(9.19, 45.46), 4326)::extensions.geography), coarse_location_at = now()
 where id = :'b';

-- a new auth user gets a profile with a generated handle
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000aa', 'nuovo@test.local');
select matches((select handle from profiles where id = '00000000-0000-0000-0000-0000000000aa'), '^[a-z]+\.[a-z]+[0-9]*$',
  'il trigger crea il profilo con un handle generato');

select tests.authenticate_as(:'a');
select is((select count(*)::int from profiles), 1, 'A vede solo la propria riga di profiles');
select is((select count(*)::int from profiles where id = :'b'), 0, 'A non legge birth_date/coarse_location di B via select');
select is((select handle from public_profiles where id = :'b'), 'volpe.viola', 'A vede l''handle di B da public_profiles');
select is((select age_band from public_profiles where id = :'b'), '25-34', 'public_profiles espone la fascia d''età');
select set_eq(
  $$ select column_name::text from information_schema.columns where table_schema = 'public' and table_name = 'public_profiles' $$,
  array['id', 'handle', 'age_band', 'gender', 'is_creator'],
  'public_profiles espone solo id, handle, age_band, gender, is_creator');
select throws_ok($$ update profiles set is_creator = true where id = auth.uid() $$, '42501', null,
  'il profilo non si modifica liberamente: niente is_creator senza RPC');
select lives_ok($$ select set_locale('en') $$, 'set_locale cambia la lingua');
select is((select locale from profiles where id = auth.uid()), 'en', 'la lingua è salvata');

-- complete_profile
select throws_ok($$ select complete_profile((current_date - interval '17 years')::date, 'female', 'milano', 'it', false, false, false) $$,
  'UNDERAGE', 'complete_profile rifiuta i minorenni');
select lives_ok($$ select complete_profile((current_date - interval '22 years')::date, 'male', 'milano', 'it', true, false, false) $$,
  'complete_profile accetta un maggiorenne');

-- coarse location: opt-in only, always coarsened
select lives_ok($$ select update_coarse_location(45.46421, 9.19003) $$, 'update_coarse_location con opt-in');
select ok((select extensions.st_distance(coarse_location,
  extensions.st_setsrid(extensions.st_makepoint(9.19003, 45.46421), 4326)::extensions.geography) > 50
  from profiles where id = auth.uid()), 'la posizione salvata è arrotondata, mai quella esatta');
select lives_ok($$ update profiles set location_opt_in = false where id = auth.uid() $$, 'si può spegnere la posizione');
select is((select coarse_location from profiles where id = auth.uid()), null, 'spegnendo la posizione si cancella quella salvata');
select throws_ok($$ select update_coarse_location(45.46, 9.19) $$, 'LOCATION_OPT_OUT', 'senza opt-in la posizione è rifiutata');

select * from finish();
rollback;
