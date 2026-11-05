begin;
\ir helpers/setup.psql
select plan(77);

-- a = viewer; b = poster, followed by a (accepted); s = stranger; p = pending follower request; k = blocked by a
select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola') as b \gset
select tests.create_user('gatto.blu') as s \gset
select tests.create_user('panda.rosa') as p \gset
select tests.create_user('lupo.nero') as k \gset
select tests.create_user('orso.verde') as nodecl \gset
select tests.make_venue('Test Club') as v \gset
select tests.make_venue('Las Canteras Club', 'club', 'las-palmas') as v_lp \gset
select tests.follow(:'a', :'b');
select tests.follow(:'p', :'b', 'pending');
select tests.follow(:'k', :'b');
select tests.make_declaration(:'b', :'v', 'going') as decl_b \gset
select tests.make_declaration(:'a', :'v', 'going') as decl_a \gset

-- ------------------------------------------------------------ get_post_target (the canPost rule)

reset role;
select tests.authenticate_as(:'nodecl');
select is((select count(*)::int from get_post_target()), 0, 'senza dichiarazione non c''è un bersaglio per il post');
select throws_ok($$ select * from create_post('ciao') $$, 'P0001', 'NO_RECENT_DECLARATION',
  'create_post senza dichiarazione recente è rifiutato');

reset role;
select tests.authenticate_as(:'b');
select is((select venue_name from get_post_target()), 'Test Club', 'con una dichiarazione attiva il bersaglio è il locale');
select isnt((select room_id from get_post_target()), null, 'e porta la chat della serata, se viva e sono membro');

reset role;
update declarations set expires_at = now() - interval '23 hours' where id = :'decl_b';
reset role;
select tests.authenticate_as(:'b');
select is((select count(*)::int from get_post_target()), 1, 'dichiarazione scaduta da 23 ore: si può ancora postare');
reset role;
update declarations set expires_at = now() - interval '25 hours' where id = :'decl_b';
reset role;
select tests.authenticate_as(:'b');
select is((select count(*)::int from get_post_target()), 0, 'scaduta da 25 ore: non più');
select throws_ok($$ select * from create_post('tardi') $$, 'P0001', 'NO_RECENT_DECLARATION',
  'e create_post lo rifiuta');
reset role;
update declarations set expires_at = target_end.e
  from (select private.target_end(night_id, null) as e from declarations where id = :'decl_b') target_end
 where id = :'decl_b';

reset role;
select tests.authenticate_as(:'b');
select undeclare();
select is((select count(*)::int from get_post_target()), 0, 'dichiarazione annullata: nessun bersaglio');
reset role;
select tests.make_declaration(:'b', :'v', 'going');
update chat_rooms set expires_at = now() - interval '1 hour'
 where night_id = (select night_id from declarations where user_id = :'b');
reset role;
select tests.authenticate_as(:'b');
select is((select room_id from get_post_target()), null, 'con la chat scaduta il bersaglio resta ma senza room');
reset role;
update chat_rooms set expires_at = now() + interval '1 day'
 where night_id = (select night_id from declarations where user_id = :'b');

-- ------------------------------------------------------------ create_post: validation and paths

reset role;
select tests.authenticate_as(:'b');
select throws_ok($$ select * from create_post(null, null, null) $$, 'P0001', 'INVALID_POST', 'serve almeno testo o foto');
select throws_ok($$ select * from create_post('   ') $$, 'P0001', 'INVALID_POST', 'un testo di soli spazi non basta');
select throws_ok(format($$ select * from create_post(%L) $$, repeat('x', 501)), 'P0001', 'INVALID_POST', 'oltre 500 caratteri rifiutato');
select throws_ok(format($$ select * from create_post(null, %L) $$, :'a' || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg'),
  'P0001', 'INVALID_PHOTO_PATH', 'non si cita il file di un altro utente');
select throws_ok(format($$ select * from create_post(null, %L) $$, :'b' || '/../x.jpg'),
  'P0001', 'INVALID_PHOTO_PATH', 'path malformato rifiutato');
select throws_ok(format($$ select * from create_post(null, %L, %L) $$,
    :'b' || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg', :'a' || '/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg'),
  'P0001', 'INVALID_PHOTO_PATH', 'anche il file per la chat deve essere mio');
select throws_ok(format($$ select * from create_post('x', null, %L) $$, :'b' || '/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg'),
  'P0001', 'INVALID_POST', 'un file per la chat senza la foto del post non ha senso');
select throws_ok($$ insert into posts (user_id, caption) values (auth.uid(), 'diretto') $$, '42501', null,
  'insert diretto su posts negato: si pubblica solo via RPC');

-- ------------------------------------------------------------ create_post: window and chat message

select lives_ok(format($$ select * from create_post('che serata', %L, %L) $$,
    :'b' || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg', :'b' || '/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg'),
  'pubblico con foto e foto per la chat');
select is((select kind from chat_messages where photo_path = :'b' || '/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb.jpg'), 'photo',
  'compare subito nella chat della serata come messaggio foto');
select is((select count(*)::int from chat_messages where photo_path = :'b' || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg'), 0,
  'il file del post (7 giorni) non finisce in chat (2 giorni)');
select is((select visible_from from posts where photo_path = :'b' || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg'),
  public.night_end(public.current_night_date((select city_id from venues where id = :'v')), 'Europe/Rome'),
  'pubblicato durante la serata: visibile dalla fine della serata');
select is(((select visible_from from posts where photo_path = :'b' || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg')
            at time zone 'Europe/Rome')::time, '06:00:00'::time, 'e sono le 06:00 nel fuso di Milano');
select is((select expires_at - visible_from from posts where photo_path = :'b' || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg'),
  interval '7 days', 'scade 7 giorni dopo');

select lives_ok($$ select * from create_post('solo testo') $$, 'un post di solo testo non scrive in chat');
select is((select count(*)::int from chat_messages where user_id = auth.uid()), 1, 'nessun altro messaggio in chat');

reset role;
update chat_rooms set expires_at = now() - interval '1 hour'
 where night_id = (select night_id from declarations where user_id = :'b');
reset role;
select tests.authenticate_as(:'b');
select lives_ok(format($$ select * from create_post('tardi', %L, %L) $$,
    :'b' || '/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg', :'b' || '/dddddddd-dddd-4ddd-8ddd-dddddddddddd.jpg'),
  'con la chat scaduta il post si pubblica lo stesso');
select is((select count(*)::int from chat_messages where photo_path = :'b' || '/dddddddd-dddd-4ddd-8ddd-dddddddddddd.jpg'), 0,
  'ma non scrive in una chat morta');

-- Las Palmas: 06:00 in its own timezone
reset role;
select tests.create_user('tigre.oro') as lp \gset
select tests.make_declaration(:'lp', :'v_lp', 'going');
reset role;
select tests.authenticate_as(:'lp');
select lives_ok($$ select * from create_post('hola') $$, 'post a Las Palmas');
select is(((select visible_from from posts where user_id = auth.uid()) at time zone 'Atlantic/Canary')::time, '06:00:00'::time,
  'visible_from sono le 06:00 nel fuso di Las Palmas');

-- the day after: the night is over, the post is visible at once and lives 7 days
reset role;
select tests.create_user('cane.grigio') as late \gset
select tests.follow(:'a', :'late');
insert into declarations (user_id, night_id, intent)
  values (:'late', private.ensure_night(:'v', public.current_night_date((select city_id from venues where id = :'v')) - 1), 'going');
reset role;
select tests.authenticate_as(:'late');
select lives_ok($$ select * from create_post('ieri sera') $$, 'il giorno dopo si può ancora pubblicare');
select ok((select visible_from <= now() from posts where user_id = auth.uid()), 'visible_from è già passato');
select is((select expires_at - visible_from from posts where user_id = auth.uid()), interval '7 days', 'e scade 7 giorni dopo');
reset role;
select tests.authenticate_as(:'a');
select is((select count(*)::int from get_feed() where author_id = :'late'), 1, 'il follower lo vede subito nel feed');

-- ------------------------------------------------------------ visibility: window, follows, blocks

reset role;
select id as pic_post from posts where photo_path = :'b' || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg' \gset
reset role;
select tests.authenticate_as(:'a');
select is((select count(*)::int from get_feed() where post_id = :'pic_post'), 0, 'prima di visible_from il follower non vede il post');
reset role;
update posts set visible_from = now() - interval '1 hour', expires_at = now() + interval '6 days' where id = :'pic_post';
reset role;
select tests.authenticate_as(:'a');
select is((select count(*)::int from get_feed() where post_id = :'pic_post'), 1, 'dopo visible_from sì');
select is((select has_photo from get_feed() where post_id = :'pic_post'), true, 'e segnala che c''è una foto');
select is((select venue_name from get_feed() where post_id = :'pic_post'), 'Test Club', 'con il nome del locale');
select ok(not exists (select 1 from pg_proc where proname in ('get_feed', 'get_story_posts', 'get_post_comments')
                        and 'photo_path' = any (proargnames)), 'il feed non espone mai photo_path');

reset role;
select tests.authenticate_as(:'s');
select is((select count(*)::int from get_feed()), 0, 'un non follower non vede nulla nel feed');
select is((select count(*)::int from posts where user_id = :'b'), 0, 'né con una select diretta');
reset role;
select tests.authenticate_as(:'p');
select is((select count(*)::int from get_feed() where author_id = :'b'), 0, 'una richiesta pending non sblocca il feed');
select is((select count(*)::int from posts where user_id = :'b'), 0, 'né la select diretta');
reset role;
select tests.authenticate_as(:'a');
select is((select count(*)::int from get_feed() where author_id = :'b'), 1, 'il follower accettato vede il post nella finestra');
reset role;
insert into blocks (blocker_id, blocked_id) values (:'k', :'b');
delete from follows where follower_id = :'k';
reset role;
select tests.authenticate_as(:'k');
select is((select count(*)::int from get_feed() where author_id = :'b'), 0, 'un bloccato non vede il post');

reset role;
update posts set expires_at = now() - interval '1 minute' where id = :'pic_post';
reset role;
select tests.authenticate_as(:'a');
select is((select count(*)::int from get_feed() where post_id = :'pic_post'), 0, 'scaduto (expires_at) sparisce dal feed');
reset role;
update posts set expires_at = now() + interval '6 days' where id = :'pic_post';

-- ------------------------------------------------------------ pagination with a composite cursor

reset role;
select tests.create_user('gufo.blu') as pg_author \gset
select tests.create_user('riccio.giallo') as pg_viewer \gset
select tests.follow(:'pg_viewer', :'pg_author');
select tests.make_post(:'pg_author', :'v', now() - interval '1 hour', now() + interval '6 days') from generate_series(1, 25);
reset role;
select tests.authenticate_as(:'pg_viewer');
select is((
  with p1 as (select * from get_feed(null, null, 10)),
       l1 as (select visible_from, post_id from p1 order by visible_from desc, post_id desc limit 1 offset 9),
       p2 as (select * from get_feed((select visible_from from l1), (select post_id from l1), 10)),
       l2 as (select visible_from, post_id from p2 order by visible_from desc, post_id desc limit 1 offset 9),
       p3 as (select * from get_feed((select visible_from from l2), (select post_id from l2), 10))
  select (select count(*) from p1) || '/' || (select count(*) from p2) || '/' || (select count(*) from p3) || '/'
         || (select count(distinct post_id) from (select post_id from p1 union all select post_id from p2 union all select post_id from p3) x)
), '10/10/5/25', '25 post con la stessa visible_from: tre pagine, nessun buco e nessun doppione');

-- ------------------------------------------------------------ stories

reset role;
select tests.authenticate_as(:'a');
select ok((select count(*) from get_story_posts(:'late')) = 1, 'get_story_posts: i post di un seguito delle ultime 24 ore');
select is((select count(*)::int from get_story_posts(:'s')), 0, 'chi non ho nei seguiti non ha storia per me');
reset role;
update posts set visible_from = now() - interval '3 days' where user_id = :'late';
reset role;
select tests.authenticate_as(:'a');
select is((select count(*)::int from get_story_posts(:'late')), 0, 'un post più vecchio di 24 ore non è una storia');
reset role;
select tests.authenticate_as(:'b');
select ok((select count(*) from get_story_posts(:'b')) >= 1, 'la mia storia comprende i miei post recenti anche se non ancora visibili agli altri');

-- ------------------------------------------------------------ likes

reset role;
select tests.authenticate_as(:'a');
select is((select like_count from set_post_like(:'pic_post', true)), 1, 'like: contatore 1');
select is((select like_count from set_post_like(:'pic_post', true)), 1, 'il like è idempotente');
select is((select liked_by_me from get_feed() where post_id = :'pic_post'), true, 'il feed segna il mio like');
select is((select like_count from set_post_like(:'pic_post', false)), 0, 'tolgo il like');
select is((select like_count from set_post_like(:'pic_post', false)), 0, 'toglierlo due volte non rompe nulla');
reset role;
select tests.authenticate_as(:'s');
select throws_ok(format($$ select * from set_post_like(%L, true) $$, :'pic_post'), 'P0001', 'POST_NOT_FOUND',
  'like su un post invisibile: errore');

-- ------------------------------------------------------------ comments

reset role;
delete from blocks where blocker_id = :'k';
select tests.follow(:'k', :'b');
reset role;
select tests.authenticate_as(:'k');
select lives_ok(format($$ select * from add_post_comment(%L, 'commento di k') $$, :'pic_post'), 'k commenta');
reset role;
insert into blocks (blocker_id, blocked_id) values (:'a', :'k');
reset role;
select tests.authenticate_as(:'a');
select throws_ok(format($$ select * from add_post_comment(%L, %L) $$, :'pic_post', repeat('x', 301)), 'P0001', 'INVALID_COMMENT',
  'commento oltre 300 caratteri rifiutato');
select throws_ok(format($$ select * from add_post_comment(%L, '  ') $$, :'pic_post'), 'P0001', 'INVALID_COMMENT', 'commento vuoto rifiutato');
select lives_ok(format($$ select * from add_post_comment(%L, 'bella!') $$, :'pic_post'), 'a commenta');
select is((select array_agg(text) from get_post_comments(:'pic_post')), array['bella!'],
  'i commenti di un utente che ho bloccato non si vedono');
select is((select comment_count from get_feed() where post_id = :'pic_post'), 1, 'e non entrano nel contatore');
select is((select can_delete from get_post_comments(:'pic_post') where is_mine), true, 'posso cancellare il mio commento');
reset role;
select tests.authenticate_as(:'b');
select is((select bool_and(can_delete) from get_post_comments(:'pic_post')), true, 'l''autore del post può cancellare ogni commento');
select lives_ok(format($$ select delete_post_comment(c.id) from post_comments c where c.post_id = %L and c.user_id = %L $$,
    :'pic_post', :'a'), 'l''autore del post cancella il commento altrui');
reset role;
select tests.follow(:'pg_viewer', :'b');
reset role;
select tests.authenticate_as(:'pg_viewer');
select lives_ok(format($$ select * from add_post_comment(%L, 'terzo') $$, :'pic_post'), 'un terzo follower commenta');
reset role;
select tests.authenticate_as(:'a');
select throws_ok(format($$ select delete_post_comment(c.id) from post_comments c where c.user_id = %L $$, :'pg_viewer'),
  'P0001', 'NOT_FOUND', 'un terzo non cancella il commento di un altro');

-- ------------------------------------------------------------ photo paths, deletion queue, reports

reset role;
select tests.authenticate_as(:'a');
select is((select count(*)::int from get_post_photo_paths(array[:'pic_post']::uuid[])), 1, 'get_post_photo_paths: foto di un post visibile');
reset role;
select tests.authenticate_as(:'s');
select is((select count(*)::int from get_post_photo_paths(array[:'pic_post']::uuid[])), 0, 'mai per un post invisibile');
select throws_ok($$ select * from get_post_photo_paths((select array_agg(gen_random_uuid()) from generate_series(1, 101))) $$,
  'P0001', 'INVALID_ARGUMENT', 'più di 100 id rifiutati');

reset role;
select tests.authenticate_as(:'a');
select throws_ok(format($$ select delete_post(%L) $$, :'pic_post'), 'P0001', 'NOT_FOUND', 'non si cancella il post di un altro');
reset role;
select tests.authenticate_as(:'b');
select lives_ok(format($$ select delete_post(%L) $$, :'pic_post'), 'cancello il mio post');
reset role;
select is((select count(*)::int from private.storage_deletion_queue
            where bucket_id = 'posts' and object_path = :'b' || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg'), 1,
  'cancellare un post accoda il suo file per la pulizia');

reset role;
select tests.authenticate_as(:'a');
select lives_ok($$ select report('comment', gen_random_uuid(), 'spam') $$, 'si può segnalare un commento');
reset role;
select is((select count(*)::int from reports where target_kind = 'comment'), 1, 'la segnalazione è registrata');

select ok(not has_function_privilege('anon', 'get_post_target()', 'execute')
      and not has_function_privilege('anon', 'create_post(text,text,text)', 'execute')
      and not has_function_privilege('anon', 'get_feed(timestamptz,uuid,int)', 'execute')
      and not has_function_privilege('anon', 'get_story_posts(uuid)', 'execute')
      and not has_function_privilege('anon', 'set_post_like(uuid,boolean)', 'execute')
      and not has_function_privilege('anon', 'get_post_comments(uuid,timestamptz,int)', 'execute')
      and not has_function_privilege('anon', 'add_post_comment(uuid,text)', 'execute')
      and not has_function_privilege('anon', 'delete_post_comment(uuid)', 'execute')
      and not has_function_privilege('anon', 'delete_post(uuid)', 'execute')
      and not has_function_privilege('anon', 'get_post_photo_paths(uuid[])', 'execute'),
  'anon non esegue nulla');
select ok(to_regprocedure('public.get_feed(timestamptz,integer)') is null, 'la vecchia firma di get_feed non esiste più');

select * from finish();
rollback;
