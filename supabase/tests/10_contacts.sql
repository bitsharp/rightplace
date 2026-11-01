begin;
\ir helpers/setup.psql
select plan(7);

select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola') as b \gset
select tests.create_user('gatto.blu') as c \gset
select repeat('b', 64) as hash_b \gset
select repeat('c', 64) as hash_c \gset

select tests.authenticate_as(:'b');
select lives_ok(format($$ select set_my_phone_hash(%L) $$, :'hash_b'), 'B registra l''hash del proprio numero');
select throws_ok($$ select set_my_phone_hash('3331234567') $$, 'INVALID_HASH', 'un numero in chiaro è rifiutato');
reset role;
select tests.authenticate_as(:'c');
select set_my_phone_hash(:'hash_c');
reset role;
select tests.follow(:'a', :'c');

select tests.authenticate_as(:'a');
select is((select array_agg(handle) from match_contacts(array[:'hash_b', :'hash_c', repeat('d', 64)])), array['volpe.viola'],
  'match_contacts trova i contatti non ancora seguiti');
select is((select count(*)::int from contact_hashes_tmp), 0, 'il client non legge gli hash temporanei');
reset role;
select is((select count(*)::int from contact_hashes_tmp), 0, 'contact_hashes_tmp è vuota a fine chiamata');
select tests.authenticate_as(:'b');
select lives_ok($$ select clear_my_phone_hash() $$, 'B toglie il proprio hash');
reset role;
select is((select count(*)::int from phone_hashes where user_id = :'b'), 0, 'l''hash di B è cancellato');

select * from finish();
rollback;
