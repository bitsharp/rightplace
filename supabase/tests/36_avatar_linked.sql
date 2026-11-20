begin;
\ir helpers/setup.psql
select plan(9);

-- Principle 1 (20/11/2026): the photo is visible to its owner and to anyone linked by an accepted follow in either
-- direction (private.is_linked), never across a block.
-- a = owner; fo = follows a (accepted); fe = followed by a (accepted); pi = pending toward a; po = a's pending toward them;
-- st = stranger; bf = follower of a, blocked by a; fb = followed by a, but blocked a
select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola') as fo \gset
select tests.create_user('gatto.blu') as fe \gset
select tests.create_user('panda.rosa') as pi \gset
select tests.create_user('lupo.nero') as po \gset
select tests.create_user('orso.verde') as st \gset
select tests.create_user('tigre.arancio') as bf \gset
select tests.create_user('cane.giallo') as fb \gset
select tests.follow(:'fo', :'a');
select tests.follow(:'a', :'fe');
select tests.follow(:'pi', :'a', 'pending');
select tests.follow(:'a', :'po', 'pending');
select tests.follow(:'bf', :'a');
select tests.follow(:'a', :'fb');
insert into blocks (blocker_id, blocked_id) values (:'a', :'bf'), (:'fb', :'a');
select gen_random_uuid() as pic \gset
update profiles set avatar_path = :'a' || '/' || :'pic' || '.jpg' where id = :'a';

select tests.authenticate_as(:'fo');
select is((select count(*)::int from get_avatar_paths(array[:'a'::uuid])), 1, 'chi mi segue (accettato) vede la foto');
reset role;
select tests.authenticate_as(:'fe');
select is((select count(*)::int from get_avatar_paths(array[:'a'::uuid])), 1,
  'chi è seguito da me (accettato) vede la foto, anche se non mi segue');
reset role;
select tests.authenticate_as(:'pi');
select is((select count(*)::int from get_avatar_paths(array[:'a'::uuid])), 0, 'richiesta pending verso di me: non vede');
reset role;
select tests.authenticate_as(:'po');
select is((select count(*)::int from get_avatar_paths(array[:'a'::uuid])), 0, 'mia richiesta pending verso di lui: non vede');
reset role;
select tests.authenticate_as(:'st');
select is((select count(*)::int from get_avatar_paths(array[:'a'::uuid])), 0, 'sconosciuto: non vede');
reset role;
select tests.authenticate_as(:'bf');
select is((select count(*)::int from get_avatar_paths(array[:'a'::uuid])), 0, 'bloccato da me, pur seguendomi: non vede');
reset role;
select tests.authenticate_as(:'fb');
select is((select count(*)::int from get_avatar_paths(array[:'a'::uuid])), 0, 'chi mi ha bloccato, pur seguito da me: non vede');
reset role;
select tests.authenticate_as(:'a');
select is((select count(*)::int from get_avatar_paths(array[:'a'::uuid])), 1, 'io vedo la mia foto');
reset role;
select is(private.can_see_avatar(:'fe', :'a'), true, 'can_see_avatar segue is_linked (seguito da me: vede)');

select * from finish();
rollback;
