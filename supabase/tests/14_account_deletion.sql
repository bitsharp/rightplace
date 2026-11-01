begin;
\ir helpers/setup.psql
select plan(7);

select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola') as b \gset
select tests.follow(:'b', :'a');

select tests.authenticate_as(:'a');
select lives_ok($$ select delete_my_account() $$, 'A chiede di eliminare l''account');
reset role;
select ok((select deleted_at is not null and birth_date is null from profiles where id = :'a'),
  'i dati personali spariscono subito');
select is((select count(*)::int from follows where followee_id = :'a'), 0, 'i follow spariscono subito');
select is((select count(*)::int from private.account_deletion_requests where user_id = :'a'), 1, 'la richiesta è in coda');

select private.process_account_deletions();
select is((select count(*)::int from auth.users where id = :'a'), 0, 'il job elimina l''utente di Auth (email inclusa)');
select is((select count(*)::int from private.account_deletion_requests), 0, 'e svuota la coda');
select ok(exists (select 1 from cron.job where jobname = 'process-account-deletions'), 'il job è pianificato');

select * from finish();
rollback;
