begin;
\ir helpers/setup.psql
select plan(44);

-- Prompt 19: in a night chat I see me, anyone linked to me (accepted follow in EITHER direction) and anyone linked to a
-- friend of mine who is declared in the SAME room. A block always wins.

-- sees(viewer, room, author): does get_room_messages(room) show that author's message to the viewer?
create function tests.sees(p_viewer uuid, p_room uuid, p_author uuid) returns boolean language plpgsql as $$
declare v boolean;
begin
  perform tests.authenticate_as(p_viewer);
  select exists (select 1 from public.get_room_messages(p_room) where user_id = p_author) into v;
  reset role;
  return v;
end $$;

-- sees_row(viewer, room, author): same question through the table policy (what Realtime evaluates).
create function tests.sees_row(p_viewer uuid, p_room uuid, p_author uuid) returns boolean language plpgsql as $$
declare v boolean;
begin
  perform tests.authenticate_as(p_viewer);
  select exists (select 1 from public.chat_messages where room_id = p_room and user_id = p_author) into v;
  reset role;
  return v;
end $$;

create function tests.say(p_room uuid, p_user uuid, p_text text) returns void language sql as $$
  insert into public.chat_messages (room_id, user_id, kind, text, created_at) values (p_room, p_user, 'text', p_text, clock_timestamp())
$$;

create function tests.room_of(p_venue uuid) returns uuid language sql as $$
  select r.id from public.chat_rooms r join public.nights n on n.id = r.night_id where n.venue_id = p_venue
$$;

-- ================================================================ scenario 2: common friend in the same room
select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola') as b \gset
select tests.create_user('gatto.blu') as c \gset
select tests.make_venue('Locale Uno') as v1 \gset
select tests.make_declaration(:'a', :'v1', 'going') as decl_a \gset
select tests.make_declaration(:'b', :'v1', 'maybe') as decl_b \gset
select tests.make_declaration(:'c', :'v1', 'going');
select tests.room_of(:'v1') as r1 \gset
-- a follows b (accepted); b is followed BY nobody here but follows c: linked is symmetric, direction does not matter
select tests.follow(:'a', :'b');
select tests.follow(:'b', :'c');
select tests.say(:'r1', :'a', 'da a');
select tests.say(:'r1', :'b', 'da b');
select tests.say(:'r1', :'c', 'da c');

select ok(tests.sees(:'a', :'r1', :'b'), '1: a vede b (follow accettato a->b)');
select ok(tests.sees(:'b', :'r1', :'a'), '1: b vede a (la relazione è simmetrica)');
select ok(tests.sees(:'a', :'r1', :'c'), '2: a vede c tramite b dichiarato nella stessa room');
select ok(tests.sees(:'c', :'r1', :'a'), '2: c vede a tramite b dichiarato nella stessa room');
select ok(tests.sees(:'b', :'r1', :'c'), '6: follow solo in direzione inversa (b->c, visto da c verso b) conta come linked');
select ok(tests.sees(:'c', :'r1', :'b'), '6: e viceversa');
select ok(tests.sees_row(:'a', :'r1', :'c'), '2: la policy su chat_messages (Realtime) mostra c ad a');
select ok(tests.sees_row(:'c', :'r1', :'a'), '2: e a c mostra a');
select ok(tests.sees(:'a', :'r1', :'a'), 'vedo sempre me stesso');

-- the rest of the room surface follows the same rule
select tests.authenticate_as(:'a');
select is((select friends_inside from get_my_chat_rooms() where room_id = :'r1'), 2,
  '2: friends_inside di a conta b e c');
select is((select last_handle from get_my_chat_rooms() where room_id = :'r1'), 'gatto.blu',
  '2: l''ultimo messaggio visibile ad a è quello di c');
reset role;
insert into chat_messages (id, room_id, user_id, kind, photo_path, created_at)
  values ('00000000-0000-0000-0000-0000000000c1', :'r1', :'c', 'photo', :'c' || '/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg', clock_timestamp());
select tests.authenticate_as(:'a');
select is((select photo_count from get_my_chat_rooms() where room_id = :'r1'), 1, '2: photo_count di a include la foto di c');
select is((select count(*)::int from get_chat_photo_paths(array['00000000-0000-0000-0000-0000000000c1']::uuid[])), 1,
  '2: get_chat_photo_paths firma la foto di c per a');
reset role;

-- notifications use the very same rule: c's message queues a push for a (and b), not for c himself
select is((select array_agg(distinct user_id) from private.notification_queue
            where kind = 'chat_message' and params ->> 'handle' = 'gatto.blu' and params ->> 'room_id' = :'r1'::text),
  (select array_agg(x order by x) from unnest(array[:'a'::uuid, :'b'::uuid]) x),
  '2: il messaggio di c accoda una push per a e b');

-- ================================================================ scenario 3: common friend in ANOTHER room
select tests.create_user('orso.verde') as a3 \gset
select tests.create_user('lupo.nero') as b3 \gset
select tests.create_user('panda.rosa') as c3 \gset
select tests.make_venue('Locale Due') as v2 \gset
select tests.make_venue('Locale Tre') as v3 \gset
select tests.make_declaration(:'a3', :'v2', 'going');
select tests.make_declaration(:'c3', :'v2', 'going');
select tests.make_declaration(:'b3', :'v3', 'going');
select tests.room_of(:'v2') as r2 \gset
select tests.follow(:'a3', :'b3');
select tests.follow(:'c3', :'b3');
select tests.say(:'r2', :'a3', 'da a3');
select tests.say(:'r2', :'c3', 'da c3');
select ok(not tests.sees(:'a3', :'r2', :'c3'), '3: con l''amico comune in un''altra room a non vede c');
select ok(not tests.sees(:'c3', :'r2', :'a3'), '3: e c non vede a');
select ok(not tests.sees_row(:'a3', :'r2', :'c3'), '3: nemmeno la policy mostra c ad a');
select tests.authenticate_as(:'a3');
select is((select friends_inside from get_my_chat_rooms() where room_id = :'r2'), 0, '3: friends_inside è 0');
reset role;
select is((select count(*)::int from private.notification_queue
            where user_id = :'a3' and kind = 'chat_message' and params ->> 'handle' = 'panda.rosa'), 0,
  '3: nessuna push per a dal messaggio di c');

-- ================================================================ scenario 4: blocks always win
select tests.create_user('tigre.gialla') as a4 \gset
select tests.create_user('cane.grigio') as b4 \gset
select tests.create_user('lepre.bianca') as c4 \gset
select tests.make_venue('Locale Quattro') as v4 \gset
select tests.make_declaration(:'a4', :'v4', 'going');
select tests.make_declaration(:'b4', :'v4', 'going');
select tests.make_declaration(:'c4', :'v4', 'going');
select tests.room_of(:'v4') as r4 \gset
select tests.follow(:'a4', :'b4');
select tests.follow(:'c4', :'b4');
select tests.say(:'r4', :'a4', 'da a4');
select tests.say(:'r4', :'b4', 'da b4');
select tests.say(:'r4', :'c4', 'da c4');
select ok(tests.sees(:'a4', :'r4', :'c4'), '4: (controllo) senza blocco a vede c4 tramite b4');
insert into blocks (blocker_id, blocked_id) values (:'a4', :'c4');
select ok(not tests.sees(:'a4', :'r4', :'c4'), '4: a ha bloccato c: c è invisibile ad a anche con b');
select ok(not tests.sees(:'c4', :'r4', :'a4'), '4: e a è invisibile a c');
select ok(not tests.sees_row(:'a4', :'r4', :'c4') and not tests.sees_row(:'c4', :'r4', :'a4'), '4: anche via policy');
select ok(tests.sees(:'a4', :'r4', :'b4'), '4: il blocco tra a e c non toglie b ad a');

select tests.create_user('aquila.rossa') as a5 \gset
select tests.create_user('cervo.bruno') as b5 \gset
select tests.create_user('rana.verde') as c5 \gset
select tests.make_venue('Locale Cinque') as v5 \gset
select tests.make_declaration(:'a5', :'v5', 'going');
select tests.make_declaration(:'b5', :'v5', 'going');
select tests.make_declaration(:'c5', :'v5', 'going');
select tests.room_of(:'v5') as r5 \gset
select tests.follow(:'a5', :'b5');
select tests.follow(:'b5', :'c5');
select tests.say(:'r5', :'b5', 'da b5');
select tests.say(:'r5', :'c5', 'da c5');
select ok(tests.sees(:'a5', :'r5', :'c5'), '4: (controllo) a5 vede c5 tramite b5');
insert into blocks (blocker_id, blocked_id) values (:'b5', :'c5');
select ok(not tests.sees(:'a5', :'r5', :'c5'), '4: blocco tra b e c: b non fa più da ponte');
select ok(tests.sees(:'a5', :'r5', :'b5') and not tests.sees(:'c5', :'r5', :'b5'), '4: a5 vede ancora b5 e c5 non vede b5');

-- ================================================================ scenario 5: pending does not count
select tests.create_user('zebra.nera') as a6 \gset
select tests.create_user('foca.blu') as b6 \gset
select tests.create_user('gufo.viola') as c6 \gset
select tests.make_venue('Locale Sei') as v6 \gset
select tests.make_declaration(:'a6', :'v6', 'going');
select tests.make_declaration(:'b6', :'v6', 'going');
select tests.make_declaration(:'c6', :'v6', 'going');
select tests.room_of(:'v6') as r6 \gset
select tests.follow(:'a6', :'b6', 'pending');
select tests.follow(:'b6', :'c6');
select tests.say(:'r6', :'b6', 'da b6');
select tests.say(:'r6', :'c6', 'da c6');
select ok(not tests.sees(:'a6', :'r6', :'b6'), '5: a->b pending non sblocca b');
select ok(not tests.sees(:'a6', :'r6', :'c6'), '5: a->b pending: b non fa da ponte verso c');
select tests.create_user('ibis.rosa') as a7 \gset
select tests.create_user('lama.grigio') as b7 \gset
select tests.create_user('tasso.verde') as c7 \gset
select tests.make_venue('Locale Sette') as v7 \gset
select tests.make_declaration(:'a7', :'v7', 'going');
select tests.make_declaration(:'b7', :'v7', 'going');
select tests.make_declaration(:'c7', :'v7', 'going');
select tests.room_of(:'v7') as r7 \gset
select tests.follow(:'a7', :'b7');
select tests.follow(:'b7', :'c7', 'pending');
select tests.say(:'r7', :'c7', 'da c7');
select ok(not tests.sees(:'a7', :'r7', :'c7'), '5: b->c pending: nessun ponte verso c');

-- ================================================================ the bridge leaves: visibility is re-evaluated at every read
select tests.authenticate_as(:'b');
select undeclare();
reset role;
select ok(not tests.sees(:'a', :'r1', :'c') and not tests.sees(:'c', :'r1', :'a'),
  'b annulla la dichiarazione: a e c non si vedono più (anche i messaggi passati)');
select ok(not tests.sees_row(:'a', :'r1', :'c'), 'idem via policy');

-- breaking the follow also removes the bridge
select tests.create_user('puma.arancio') as a8 \gset
select tests.create_user('alce.blu') as b8 \gset
select tests.create_user('pavone.verde') as c8 \gset
select tests.make_venue('Locale Otto') as v8 \gset
select tests.make_declaration(:'a8', :'v8', 'going');
select tests.make_declaration(:'b8', :'v8', 'going');
select tests.make_declaration(:'c8', :'v8', 'going');
select tests.room_of(:'v8') as r8 \gset
select tests.follow(:'a8', :'b8');
select tests.follow(:'b8', :'c8');
select tests.say(:'r8', :'c8', 'da c8');
select ok(tests.sees(:'a8', :'r8', :'c8'), '(controllo) a8 vede c8 tramite b8');
delete from follows where follower_id = :'b8' and followee_id = :'c8';
select ok(not tests.sees(:'a8', :'r8', :'c8'), 'b8 smette di seguire c8: il ponte cade subito');

-- a non-member never reads, even if linked to everybody
select tests.create_user('riccio.nero') as z \gset
select tests.follow(:'z', :'a');
select tests.authenticate_as(:'z');
select throws_ok(format($$ select * from get_room_messages(%L) $$, :'r1'), 'P0001', 'NOT_ROOM_MEMBER',
  'chi non ha dichiarato non legge, nemmeno se segue qualcuno');
select is((select count(*)::int from chat_messages where room_id = :'r1'), 0, 'e la policy non gli mostra nulla');
reset role;

-- ================================================================ one rule, old signatures gone, privileges
select ok(to_regprocedure('private.can_see_chat_author(uuid)') is null
      and to_regprocedure('private.can_see_chat_author_for(uuid,uuid)') is null,
  'le vecchie firme senza room non esistono più');
select ok(to_regprocedure('private.can_see_chat_author_for(uuid,uuid,uuid)') is not null
      and to_regprocedure('private.can_see_chat_author(uuid,uuid)') is not null
      and to_regprocedure('private.is_linked(uuid,uuid)') is not null, 'le nuove funzioni esistono');
select ok(pg_get_functiondef('private.can_see_chat_author(uuid,uuid)'::regprocedure) like '%can_see_chat_author_for%',
  'la regola vive in un solo posto: il wrapper chiama can_see_chat_author_for');
select ok(not has_function_privilege('authenticated', 'private.is_linked(uuid,uuid)', 'execute')
      and not has_function_privilege('authenticated', 'private.can_see_chat_author_for(uuid,uuid,uuid)', 'execute')
      and not has_function_privilege('anon', 'private.can_see_chat_author(uuid,uuid)', 'execute')
      and has_function_privilege('authenticated', 'private.can_see_chat_author(uuid,uuid)', 'execute'),
  'solo il wrapper con auth.uid() è eseguibile da authenticated (serve alla policy); anon e la regola con viewer esplicito no');
select ok(not has_function_privilege('anon', 'send_chat_message(uuid,text,text)', 'execute')
      and not has_function_privilege('anon', 'get_room_messages(uuid,timestamptz,int)', 'execute')
      and not has_function_privilege('anon', 'get_my_chat_rooms()', 'execute')
      and not has_function_privilege('anon', 'get_chat_photo_paths(uuid[])', 'execute'),
  'anon non esegue nessuna RPC della chat');
select ok(private.is_linked(:'a', :'z') and private.is_linked(:'z', :'a') and not private.is_linked(:'a', :'c8'),
  'is_linked: simmetrico e solo accettato');
select ok(not private.is_linked(:'a4', :'c4') and not private.is_linked(:'a4', :'b3'),
  'is_linked non attraversa un blocco né relazioni assenti');
select ok((select obj_description('private.can_see_chat_author_for(uuid,uuid,uuid)'::regprocedure, 'pg_proc')) like '%same room%',
  'il COMMENT ON FUNCTION documenta la garanzia (stessa room)');

select * from finish();
rollback;
