begin;
\ir helpers/setup.psql
select plan(19);

select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola', 22, 'female') as b \gset
select tests.create_user('gatto.blu', 30, 'male') as c \gset
select tests.create_user('panda.rosa', 40, 'other') as d \gset
select tests.make_venue('Test Club') as v \gset
select tests.make_declaration(:'b', :'v', 'going');
select tests.make_declaration(:'c', :'v', 'going');

-- A follows B (accepted) and C (pending); D follows A (accepted)
select tests.follow(:'a', :'b');
select tests.follow(:'a', :'c', 'pending');
select tests.follow(:'d', :'a');

select tests.authenticate_as(:'a');
select results_eq($$ select handle from get_following() $$, $$ values ('volpe.viola'::text) $$,
  'get_following contiene solo i follow accettati, non le richieste pending');
select is((select tonight_venue_name from get_following()), 'Test Club',
  'il locale di stasera compare per un follow accettato');
select is((select age_band from get_following()), '18-24', 'fascia d''età, mai età esatta');
select is((select follows_me from get_following()), false, 'follows_me falso se non mi segue');
select results_eq($$ select handle, i_follow from get_followers() $$,
  $$ values ('panda.rosa'::text, false) $$, 'get_followers elenca chi mi segue con follow accettato');
select is((select count(*)::int from get_following() where user_id = :'c'), 0,
  'una richiesta pending non sblocca nulla: C non è tra i seguiti');

-- B follows A back: follows_me and i_follow flip
reset role;
select tests.follow(:'b', :'a');
select tests.follow(:'a', :'d');
select tests.authenticate_as(:'a');
select is((select follows_me from get_following() where user_id = :'b'), true, 'follows_me vero se mi segue');
select is((select i_follow from get_followers() where user_id = :'d'), true, 'i_follow vero se lo seguo a mia volta');
select is((select count(*)::int from get_followers() where user_id = :'b'), 1, 'B compare tra i miei follower');

-- visibility drops after unfollow / remove_follower
select unfollow(:'b');
select is((select count(*)::int from get_following() where user_id = :'b'), 0, 'dopo unfollow B sparisce dai seguiti');
select remove_follower(:'d');
select is((select count(*)::int from get_followers() where user_id = :'d'), 0, 'dopo remove_follower D sparisce dai follower');

-- D's view: A is not visible to D any more
reset role;
select tests.authenticate_as(:'d');
select is((select count(*)::int from get_following() where user_id = :'a'), 0, 'D non segue più A, nulla da vedere');

-- decline: C asks A, A declines
reset role;
select tests.follow(:'c', :'a', 'pending');
select tests.authenticate_as(:'a');
select decline_follow(:'c');
select is((select count(*)::int from get_followers() where user_id = :'c'), 0, 'dopo decline_follow C non è un follower');

-- blocks: excluded from lists, listed only for the blocker
reset role;
select tests.follow(:'a', :'b');
select tests.follow(:'c', :'a');
select tests.authenticate_as(:'a');
select block_user(:'c');
select block_user(:'b');
select is((select count(*)::int from get_following() where user_id in (:'b', :'c')), 0, 'i bloccati escono dai seguiti');
select is((select count(*)::int from get_followers() where user_id in (:'b', :'c')), 0, 'i bloccati escono dai follower');
select results_eq($$ select handle from get_blocked_users() order by handle $$,
  $$ values ('gatto.blu'::text), ('volpe.viola'::text) $$, 'get_blocked_users elenca chi ho bloccato');
select unblock_user(:'b');
select is((select count(*)::int from get_blocked_users()), 1, 'sbloccando, B esce dalla lista bloccati');

reset role;
select tests.authenticate_as(:'c');
select is((select count(*)::int from get_blocked_users()), 0, 'chi è bloccato non vede nulla nella lista di chi lo ha bloccato');

reset role;
select is(
  (select array_agg(p.proname::text order by p.proname) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in ('get_following', 'get_followers', 'get_blocked_users')
      and has_function_privilege('anon', p.oid, 'execute')),
  null, 'anon non può eseguire le nuove RPC');

select * from finish();
rollback;
