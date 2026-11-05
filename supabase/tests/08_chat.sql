begin;
\ir helpers/setup.psql
select plan(9);

select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola') as b \gset
select tests.make_venue('Test Club') as v \gset
select tests.make_declaration(:'b', :'v', 'going') as decl_b \gset

select id as room from chat_rooms where night_id = (select night_id from declarations where id = :'decl_b') \gset
select ok(:'room' is not null, 'la prima dichiarazione crea la chat della serata');
select ok((select expires_at from chat_rooms where id = :'room') =
  (select expires_at + interval '2 days' from declarations where id = :'decl_b'),
  'la chat scade 2 giorni dopo la fine della serata');

select tests.authenticate_as(:'a');
select throws_ok(format($$ insert into chat_messages (room_id, user_id, kind, text) values (%L, %L, 'text', 'ciao') $$, :'room', :'a'),
  '42501', null, 'senza dichiarazione sulla serata non si scrive in chat');
select is((select count(*)::int from chat_rooms), 0, 'senza dichiarazione non si vede la stanza');

reset role;
select tests.make_declaration(:'a', :'v', 'maybe');
select tests.authenticate_as(:'a');
select lives_ok(format($$ select * from send_chat_message(%L, 'ciao') $$, :'room'),
  'con una dichiarazione attiva si scrive in chat');
select throws_ok(format($$ insert into chat_messages (room_id, user_id, kind, text) values (%L, %L, 'text', 'falso') $$, :'room', :'b'),
  '42501', null, 'non si scrive a nome di un altro (insert diretto negato)');
select is((select count(*)::int from chat_messages), 1, 'il membro legge i messaggi della stanza');

reset role;
insert into chat_messages (room_id, user_id, kind, text) values (:'room', :'b', 'text', 'ci sono');
select tests.authenticate_as(:'a');
select is((select count(*)::int from chat_messages where user_id = :'b'), 0,
  'i messaggi di chi non seguo non si vedono (principio 6)');
reset role;
select tests.follow(:'a', :'b');
select tests.authenticate_as(:'a');
select is((select count(*)::int from chat_messages where user_id = :'b'), 1, 'con follow accettato sì');

select * from finish();
rollback;
