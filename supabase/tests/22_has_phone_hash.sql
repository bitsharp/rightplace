begin;
\ir helpers/setup.psql
select plan(7);

select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola') as b \gset
select repeat('b', 64) as hash_b \gset

select tests.authenticate_as(:'a');
select is(has_phone_hash(), false, 'senza hash registrato risponde false');
reset role;

select tests.authenticate_as(:'b');
select set_my_phone_hash(:'hash_b');
select is(has_phone_hash(), true, 'dopo set_my_phone_hash risponde true');
reset role;

select tests.authenticate_as(:'a');
select is(has_phone_hash(), false, 'ogni utente vede solo il proprio stato: A resta false');
reset role;

select tests.authenticate_as(:'b');
select clear_my_phone_hash();
select is(has_phone_hash(), false, 'dopo clear_my_phone_hash risponde false');
reset role;

select ok(
  (select prorettype = 'boolean'::regtype and pronargs = 0 from pg_proc
    where proname = 'has_phone_hash' and pronamespace = 'public'::regnamespace),
  'restituisce solo un boolean e non ha argomenti');

set local role anon;
select throws_ok($$ select has_phone_hash() $$, '42501', null, 'anon non può eseguirla');
reset role;

select ok(has_function_privilege('authenticated', 'public.has_phone_hash()', 'execute'),
  'authenticated può eseguirla');

select * from finish();
rollback;
