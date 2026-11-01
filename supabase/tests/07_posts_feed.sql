begin;
\ir helpers/setup.psql
select plan(14);

select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola') as b \gset
select tests.create_user('gatto.blu') as stranger \gset
select tests.make_venue('Test Club') as v \gset
select tests.follow(:'a', :'b');
select tests.make_post(:'b', :'v', now() - interval '1 hour', now() + interval '6 days') as visible_post \gset
select tests.make_post(:'b', :'v', now() + interval '5 hours', now() + interval '7 days') as future_post \gset
select tests.make_post(:'b', :'v', now() - interval '8 days', now() - interval '1 day') as expired_post \gset

select tests.authenticate_as(:'a');
select is((select count(*)::int from posts where id = :'visible_post'), 1, 'il follower vede il post nella finestra di visibilità');
select is((select count(*)::int from posts where id = :'future_post'), 0, 'prima di visible_from il post non si vede');
select is((select count(*)::int from posts where id = :'expired_post'), 0, 'dopo expires_at il post non si vede');
select is((select count(*)::int from get_feed()), 1, 'il feed contiene solo i post visibili ora');
select is((select author_handle from get_feed()), 'volpe.viola', 'con l''handle dell''autore');
select is((select count(*)::int from get_stories()), 1, 'B compare nella barra storie');
select lives_ok(format($$ insert into post_likes (post_id, user_id) values (%L, %L) $$, :'visible_post', :'a'), 'A mette like');
select is((select liked_by_me from get_feed()), true, 'il feed segna il like');

reset role;
select tests.create_user('orso.grigio') as other_follower \gset
select tests.follow(:'other_follower', :'b');
select tests.authenticate_as(:'other_follower');
select is((select count(*)::int from post_likes), 0, 'un altro follower non vede chi ha messo like (rivelerebbe chi segue chi)');
select is((select like_count from get_feed()), 1, 'ma vede il conteggio nel feed');

reset role;
select tests.authenticate_as(:'stranger');
select is((select count(*)::int from posts where user_id = :'b'), 0, 'un non follower non vede i post');
select is((select count(*)::int from get_stories()), 0, 'né le storie');

reset role;
insert into blocks (blocker_id, blocked_id) values (:'b', :'a');
select tests.authenticate_as(:'a');
select is((select count(*)::int from posts where user_id = :'b'), 0, 'se B blocca A, A non vede più i post di B');
select is((select count(*)::int from get_feed()), 0, 'né nel feed');

select * from finish();
rollback;
