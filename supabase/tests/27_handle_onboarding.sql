begin;
\ir helpers/setup.psql
select plan(25);

-- ---------------------------------------------------------------- column
select has_column('public', 'profiles', 'handle_confirmed_at', 'profiles ha handle_confirmed_at');
select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.blu') as b \gset
select is((select handle_confirmed_at from profiles where id = :'a'), null,
  'un profilo nuovo ha l''handle non ancora confermato');

-- ---------------------------------------------------------------- free changes until confirm
select tests.authenticate_as(:'a');
select is(set_handle('luca_97'), 'luca_97', 'onboarding: primo set_handle');
select is(set_handle('luca_98'), 'luca_98', 'onboarding: secondo set_handle subito dopo');
select isnt(regenerate_handle(), 'luca_98', 'onboarding: regenerate_handle subito dopo');
select lives_ok($$ select regenerate_handle() $$, 'onboarding: regenerate_handle ancora');
select lives_ok($$ select set_handle('luca_99') $$, 'onboarding: quinto cambio di fila');
select is((select handle from profiles where id = auth.uid()), 'luca_99', 'il profilo ha l''ultimo handle scelto');
select is((select handle_changed_at from profiles where id = auth.uid()), null,
  'in onboarding i cambi non fanno partire il limite');
select is((select handle_confirmed_at from profiles where id = auth.uid()), null, 'e non confermano l''handle');
select throws_ok($$ select set_handle('1x') $$, 'INVALID_HANDLE', 'in onboarding il formato è comunque verificato');
select throws_ok($$ select set_handle('ad.min') $$, 'HANDLE_NOT_ALLOWED', 'in onboarding la blocklist vale ancora');
select throws_ok($$ select set_handle('volpe.blu') $$, 'HANDLE_TAKEN', 'in onboarding l''unicità vale ancora');

-- ---------------------------------------------------------------- confirm_handle
select lives_ok($$ select confirm_handle() $$, 'confirm_handle è eseguibile da authenticated');
select ok((select handle_confirmed_at is not null from profiles where id = auth.uid()), 'confirm_handle conferma l''handle');
select ok((select handle_changed_at is not null from profiles where id = auth.uid()), 'confirm_handle fa partire il limite');
-- the free change after onboarding (test 28) is already used here, so the 30-day limit is what this test checks
reset role;
update profiles set handle_free_change_used = true where id = :'a';
select tests.authenticate_as(:'a');
select throws_ok($$ select set_handle('luca_100') $$, 'HANDLE_CHANGE_TOO_SOON', 'dopo confirm_handle set_handle ha il limite');
select throws_ok($$ select regenerate_handle() $$, 'HANDLE_CHANGE_TOO_SOON', 'dopo confirm_handle anche regenerate_handle');

create temp table before_confirm as
  select handle_confirmed_at, handle_changed_at from profiles where id = auth.uid();
grant select on before_confirm to authenticated;
select lives_ok($$ select confirm_handle() $$, 'confirm_handle è idempotente');
select is((select count(*) from profiles p, before_confirm b
            where p.id = auth.uid() and p.handle_confirmed_at = b.handle_confirmed_at and p.handle_changed_at = b.handle_changed_at),
  1::bigint, 'una seconda confirm_handle non sposta le date');

-- ---------------------------------------------------------------- backfill (criterion: birth_date is not null)
reset role;
select tests.create_user('gatto.verde') as c \gset
update profiles set birth_date = '2000-05-10', handle_confirmed_at = null, handle_changed_at = null where id = :'b';
update profiles set birth_date = '2000-05-10', handle_confirmed_at = null, handle_changed_at = '2026-10-01 10:00+00' where id = :'c';
-- the same statement the migration runs on the profiles that already completed onboarding
update profiles set handle_confirmed_at = coalesce(handle_changed_at, created_at)
 where handle_confirmed_at is null and birth_date is not null;
select is((select handle_confirmed_at from profiles where id = :'b'), (select created_at from profiles where id = :'b'),
  'backfill: senza cambi precedenti vale la data di creazione');
select is((select handle_confirmed_at from profiles where id = :'c'), '2026-10-01 10:00+00'::timestamptz,
  'backfill: con un cambio precedente vale la data del cambio');
select is((select handle_confirmed_at from profiles where id = :'a'), (select handle_confirmed_at from before_confirm),
  'backfill: non tocca chi ha già confermato');

-- ---------------------------------------------------------------- grants
select ok(not has_function_privilege('anon', 'public.confirm_handle()', 'execute'), 'anon non esegue confirm_handle');
select ok(has_function_privilege('authenticated', 'public.confirm_handle()', 'execute'), 'authenticated esegue confirm_handle');

select * from finish();
rollback;
