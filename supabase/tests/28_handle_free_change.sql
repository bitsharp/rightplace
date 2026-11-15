begin;
\ir helpers/setup.psql
select plan(23);

-- ---------------------------------------------------------------- column
select has_column('public', 'profiles', 'handle_free_change_used', 'profiles ha handle_free_change_used');
select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.blu') as b \gset
select tests.create_user('gatto.verde') as c \gset
select tests.create_user('orso.nero') as d \gset
select is((select handle_free_change_used from profiles where id = :'a'), false,
  'un profilo nuovo ha ancora il cambio gratuito');

-- ---------------------------------------------------------------- existing account: confirmed yesterday
reset role;
update profiles set handle_confirmed_at = now() - interval '1 day', handle_changed_at = now() - interval '1 day'
 where id = :'a';
select tests.authenticate_as(:'a');
select is(set_handle('luca_97'), 'luca_97', 'confermato ieri: il primo cambio è subito possibile');
select ok((select handle_free_change_used from profiles where id = auth.uid()), 'il cambio gratuito risulta usato');
select ok((select handle_changed_at > now() - interval '1 minute' from profiles where id = auth.uid()),
  'e il limite di 30 giorni riparte da ora');
select throws_ok($$ select set_handle('luca_98') $$, 'HANDLE_CHANGE_TOO_SOON', 'il secondo cambio entro 30 giorni è rifiutato');
select throws_ok($$ select regenerate_handle() $$, 'HANDLE_CHANGE_TOO_SOON', 'anche regenerate_handle dopo il gratuito');
select is(set_handle('luca_97'), 'luca_97', 'stesso handle: no-op anche dopo il gratuito');

reset role;
update profiles set handle_changed_at = now() - interval '29 days' where id = :'a';
select tests.authenticate_as(:'a');
select throws_ok($$ select set_handle('luca_98') $$, 'HANDLE_CHANGE_TOO_SOON', 'dopo 29 giorni è ancora presto');
reset role;
update profiles set handle_changed_at = now() - interval '31 days' where id = :'a';
select tests.authenticate_as(:'a');
select is(set_handle('luca_98'), 'luca_98', 'dopo 31 giorni si può cambiare');

-- ---------------------------------------------------------------- rejections do not consume the free change
reset role;
update profiles set handle_confirmed_at = now() - interval '1 day', handle_changed_at = now() - interval '1 day' where id = :'b';
select tests.authenticate_as(:'b');
select throws_ok($$ select set_handle('1x') $$, 'INVALID_HANDLE', 'formato invalido rifiutato');
select throws_ok($$ select set_handle('gatto.verde') $$, 'HANDLE_TAKEN', 'handle occupato rifiutato');
select is((select handle_free_change_used from profiles where id = auth.uid()), false, 'i rifiuti non consumano il cambio gratuito');
select is(set_handle('volpe.blu'), 'volpe.blu', 'impostare lo stesso handle è un no-op');
select is((select handle_free_change_used from profiles where id = auth.uid()), false, 'il no-op non consuma il cambio gratuito');

-- ---------------------------------------------------------------- regenerate consumes it too
reset role;
update profiles set handle_confirmed_at = now() - interval '1 day', handle_changed_at = now() - interval '1 day' where id = :'c';
select tests.authenticate_as(:'c');
select isnt(regenerate_handle(), 'gatto.verde', 'regenerate_handle usa il cambio gratuito');
select ok((select handle_free_change_used from profiles where id = auth.uid()), 'e lo consuma');
select throws_ok($$ select set_handle('gatto_1') $$, 'HANDLE_CHANGE_TOO_SOON', 'poi set_handle ha il limite di 30 giorni');

-- ---------------------------------------------------------------- onboarding unchanged; confirm does not consume
reset role;
select tests.authenticate_as(:'d');
select lives_ok($$ select set_handle('orso_1') $$, 'onboarding: cambio libero');
select is((select handle_free_change_used from profiles where id = auth.uid()), false, 'onboarding: non consuma il cambio gratuito');
select lives_ok($$ select confirm_handle() $$, 'confirm_handle');
select is((select handle_free_change_used from profiles where id = auth.uid()), false, 'confirm_handle non consuma il cambio gratuito');

-- ---------------------------------------------------------------- grants
reset role;
select ok(not has_function_privilege('anon', 'public.set_handle(text)', 'execute')
      and not has_function_privilege('anon', 'public.regenerate_handle()', 'execute'), 'anon non esegue set_handle né regenerate_handle');

select * from finish();
rollback;
