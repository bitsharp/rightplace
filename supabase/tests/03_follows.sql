begin;
\ir helpers/setup.psql
select plan(19);

select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola') as b \gset
select tests.create_user('gatto.blu') as c \gset
select tests.make_venue('Test Club') as v \gset
select tests.make_declaration(:'b', :'v', 'going');
select tests.make_post(:'b', :'v', now() - interval '1 hour', now() + interval '6 days') as post_b \gset

-- A (follower) asks to follow B (followee)
select tests.authenticate_as(:'a');
select throws_ok(format($$ insert into follows (follower_id, followee_id, status) values (%L, %L, 'accepted') $$, :'a', :'b'),
  null, null, 'non si può inserire un follow già accettato');
select throws_ok(format($$ insert into follows (follower_id, followee_id) values (%L, %L) $$, :'c', :'b'),
  '42501', null, 'non si può creare un follow a nome di un altro');
select is(request_follow(:'b'), 'pending', 'request_follow crea una richiesta pending');
select is(request_follow(:'b'), 'pending', 'request_follow è idempotente');
select throws_ok(format($$ select request_follow(%L) $$, :'a'), 'CANNOT_FOLLOW_SELF', 'non si segue sé stessi');
select is((select count(*)::int from get_feed()), 0, 'una richiesta pending non sblocca i post');
select is((select count(*)::int from get_venue_stats(:'v', 'all') s, jsonb_array_elements(s.friends)), 0,
  'una richiesta pending non sblocca la dichiarazione');
update follows set status = 'accepted' where follower_id = :'a' and followee_id = :'b';
select is((select status from follows where follower_id = :'a' and followee_id = :'b'), 'pending',
  'il follower non può accettare da solo la propria richiesta');

-- B accepts
reset role;
select tests.authenticate_as(:'b');
select is(count_follow_requests(), 1, 'B ha una richiesta da gestire');
select is((select handle from get_follow_requests()), 'lince.rosso', 'B vede chi ha chiesto di seguirlo');
select lives_ok(format($$ select accept_follow(%L) $$, :'a'), 'B accetta la richiesta');
select is((select status from follows where follower_id = :'a' and followee_id = :'b'), 'accepted', 'il follow è accettato');
select is(count_follow_requests(), 0, 'nessuna richiesta in sospeso');

reset role;
select tests.authenticate_as(:'a');
select is((select count(*)::int from get_feed()), 1, 'dopo l''accettazione A vede il post di B');
select is((select count(*)::int from get_venue_stats(:'v', 'all') s, jsonb_array_elements(s.friends)), 1,
  'dopo l''accettazione A vede che B va al locale');

-- B removes A: visibility drops immediately
reset role;
select tests.authenticate_as(:'b');
select lives_ok(format($$ select remove_follower(%L) $$, :'a'), 'B rimuove A dai follower');
reset role;
select tests.authenticate_as(:'a');
select is((select count(*)::int from get_feed()), 0, 'dopo remove_follower A non vede più i post di B');
select is((select count(*)::int from get_venue_stats(:'v', 'all') s, jsonb_array_elements(s.friends)), 0,
  'dopo remove_follower A non vede più la dichiarazione di B');

-- blocks prevent new requests
reset role;
insert into blocks (blocker_id, blocked_id) values (:'c', :'a');
select tests.authenticate_as(:'a');
select throws_ok(format($$ select request_follow(%L) $$, :'c'), 'BLOCKED', 'non si può chiedere di seguire chi ti ha bloccato');

select * from finish();
rollback;
