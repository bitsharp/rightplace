begin;
\ir helpers/setup.psql
select plan(37);

-- a = me; b = followed (accepted); c = declared, not followed; d = pending request; e = followed but blocked; f = no declaration
select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola') as b \gset
select tests.create_user('gatto.blu') as c \gset
select tests.create_user('panda.rosa') as d \gset
select tests.create_user('lupo.nero') as e \gset
select tests.create_user('orso.verde') as f \gset
select tests.make_venue('Test Club') as v \gset
select tests.make_declaration(:'a', :'v', 'going') as decl_a \gset
select tests.make_declaration(:'b', :'v', 'going');
select tests.make_declaration(:'c', :'v', 'going');
select tests.make_declaration(:'d', :'v', 'maybe');
select tests.make_declaration(:'e', :'v', 'going');
select tests.follow(:'a', :'b');
select tests.follow(:'a', :'c', 'pending');
select tests.follow(:'a', :'d', 'pending');
select tests.follow(:'a', :'e');
insert into blocks (blocker_id, blocked_id) values (:'e', :'a');

select id as room from chat_rooms where night_id = (select night_id from declarations where id = :'decl_a') \gset

-- membership outlives the 06:00 expiry of the declaration, but only while the room is alive
update declarations set expires_at = now() - interval '1 hour' where id = :'decl_a';

insert into chat_messages (id, room_id, user_id, kind, text, photo_path, created_at) values
  ('00000000-0000-0000-0000-00000000000b', :'room', :'b', 'text', 'ciao da b', null, now() - interval '50 minutes'),
  ('00000000-0000-0000-0000-0000000000b1', :'room', :'b', 'photo', null, :'b' || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg', now() - interval '40 minutes'),
  ('00000000-0000-0000-0000-0000000000e1', :'room', :'e', 'text', 'ciao da e', null, now() - interval '30 minutes'),
  ('00000000-0000-0000-0000-0000000000d1', :'room', :'d', 'text', 'ciao da d', null, now() - interval '20 minutes'),
  ('00000000-0000-0000-0000-0000000000c1', :'room', :'c', 'photo', null, :'c' || '/cccccccc-cccc-4ccc-8ccc-cccccccccccc.jpg', now() - interval '10 minutes');

select tests.authenticate_as(:'a');

-- membership
select lives_ok(format($$ select * from send_chat_message(%L, 'sono qui') $$, :'room'),
  'chi ha dichiarato (anche se la dichiarazione è scaduta) scrive finché la chat è viva');
select ok((select count(*) from get_room_messages(:'room')) > 0,
  'e legge finché la chat è viva');

reset role;
select tests.authenticate_as(:'f');
select throws_ok(format($$ select * from send_chat_message(%L, 'intruso') $$, :'room'),
  'P0001', 'NOT_ROOM_MEMBER', 'senza dichiarazione non si scrive');
select throws_ok(format($$ select * from get_room_messages(%L) $$, :'room'),
  'P0001', 'NOT_ROOM_MEMBER', 'senza dichiarazione non si legge');

-- a cancelled declaration (row deleted) removes access at once
reset role;
select tests.make_declaration(:'f', :'v', 'going');
select tests.authenticate_as(:'f');
select lives_ok(format($$ select * from send_chat_message(%L, 'ci sono') $$, :'room'), 'con dichiarazione attiva sì');
select undeclare();
select throws_ok(format($$ select * from send_chat_message(%L, 'ancora?') $$, :'room'),
  'P0001', 'NOT_ROOM_MEMBER', 'dopo undeclare la chat è chiusa');

-- sending
reset role;
select tests.authenticate_as(:'a');
select throws_ok(format($$ select * from send_chat_message(%L, '   ') $$, :'room'),
  'P0001', 'INVALID_MESSAGE', 'testo vuoto rifiutato');
select throws_ok(format($$ select * from send_chat_message(%L, %L) $$, :'room', repeat('x', 1001)),
  'P0001', 'INVALID_MESSAGE', 'testo oltre 1000 caratteri rifiutato');
select throws_ok(format($$ select * from send_chat_message(%L, 'x', %L) $$, :'room', :'a' || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg'),
  'P0001', 'INVALID_MESSAGE', 'testo e foto insieme rifiutati');
select throws_ok(format($$ select * from send_chat_message(%L, null, %L) $$, :'room', :'b' || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg'),
  'P0001', 'INVALID_PHOTO_PATH', 'non si cita la foto di un altro utente');
select throws_ok(format($$ select * from send_chat_message(%L, null, %L) $$, :'room', :'a' || '/../x.jpg'),
  'P0001', 'INVALID_PHOTO_PATH', 'path malformato rifiutato');
select lives_ok(format($$ select * from send_chat_message(%L, null, %L) $$, :'room', :'a' || '/dddddddd-dddd-4ddd-8ddd-dddddddddddd.jpg'),
  'foto con path <mio id>/<uuid>.jpg accettata');
select is((select kind from chat_messages where photo_path = :'a' || '/dddddddd-dddd-4ddd-8ddd-dddddddddddd.jpg'), 'photo',
  'il tipo del messaggio è dedotto dalla foto');
select throws_ok(format($$ insert into chat_messages (room_id, user_id, kind, text) values (%L, %L, 'text', 'diretto') $$, :'room', :'a'),
  '42501', null, 'insert diretto su chat_messages negato: si invia solo via RPC');

-- reading: principle 6
select is((select array_agg(text order by created_at) from get_room_messages(:'room') where kind = 'text'),
  array['ciao da b', 'sono qui'], 'vedo solo me e chi seguo (non c, non d pending, non e bloccato)');
select ok((select bool_and(is_mine) from get_room_messages(:'room') where user_id = :'a'), 'is_mine vero per i miei');
select ok(not (select bool_or(is_mine) from get_room_messages(:'room') where user_id = :'b'), 'is_mine falso per gli altri');
select is((select count(*)::int from get_room_messages(:'room', null, 1)), 1, 'il limite viene rispettato');
select is((select array_agg(text) from get_room_messages(:'room', now() - interval '45 minutes', 50)),
  array['ciao da b'], 'con p_before si leggono solo i messaggi più vecchi');
select ok(not exists (select 1 from pg_proc p where p.proname = 'get_room_messages' and 'photo_path' = any (p.proargnames)),
  'get_room_messages non espone mai photo_path');

-- room list
select is((select friends_inside from get_my_chat_rooms() where room_id = :'room'), 1,
  'friends_inside conta solo i seguiti con follow accettato e non bloccati');
select is((select photo_count from get_my_chat_rooms() where room_id = :'room'), 2,
  'photo_count conta solo le foto visibili (la mia e quella di b, non quella di c)');
select isnt((select last_handle from get_my_chat_rooms() where room_id = :'room'), 'gatto.blu',
  'l''ultimo messaggio ignora chi non seguo');
select is((select venue_name from get_my_chat_rooms() where room_id = :'room'), 'Test Club', 'la riga porta il nome del locale');

-- photo paths: only for photos I can see
select is((select array_agg(message_id) from get_chat_photo_paths(array[
    '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000c1']::uuid[])),
  array['00000000-0000-0000-0000-0000000000b1']::uuid[], 'get_chat_photo_paths firma solo le foto visibili');
select throws_ok($$ select * from get_chat_photo_paths((select array_agg(gen_random_uuid()) from generate_series(1, 101))) $$,
  'P0001', 'INVALID_ARGUMENT', 'più di 100 id rifiutati');

-- file queue and its privileges
reset role;
delete from chat_messages where id = '00000000-0000-0000-0000-0000000000b1';
select is((select count(*)::int from private.storage_deletion_queue
            where bucket_id = 'chat-photos' and object_path = :'b' || '/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa.jpg'), 1,
  'cancellare un messaggio con foto accoda il file per la pulizia');
select ok(not has_function_privilege('authenticated', 'claim_storage_deletions(int)', 'execute')
      and not has_function_privilege('authenticated', 'complete_storage_deletions(bigint[])', 'execute'),
  'i client non possono svuotare la coda dei file');
select ok(not has_function_privilege('anon', 'send_chat_message(uuid,text,text)', 'execute')
      and not has_function_privilege('anon', 'get_room_messages(uuid,timestamptz,int)', 'execute')
      and not has_function_privilege('anon', 'get_my_chat_rooms()', 'execute')
      and not has_function_privilege('anon', 'get_chat_photo_paths(uuid[])', 'execute')
      and not has_function_privilege('anon', 'claim_storage_deletions(int)', 'execute'),
  'anon non esegue nulla');
set local role service_role;
select ok((select count(*) from claim_storage_deletions(10)) >= 1, 'il service role legge la coda');
select is(complete_storage_deletions((select array_agg(id) from claim_storage_deletions(10))),
  (select count(*)::int from claim_storage_deletions(10)), 'e la svuota dopo la rimozione');
reset role;
select is((select count(*)::int from private.storage_deletion_queue), 0, 'coda vuota dopo complete');

-- storage-gc trigger from pg_cron
select ok(not has_function_privilege('authenticated', 'private.invoke_storage_gc()', 'execute'),
  'invoke_storage_gc non è eseguibile dai client');
delete from net._calls;
select private.invoke_storage_gc();
select is((select count(*)::int from net._calls), 0, 'senza segreti nel Vault invoke_storage_gc non fa nulla');
insert into vault.decrypted_secrets (name, decrypted_secret) values
  ('storage_gc_url', 'https://example.test/functions/v1/storage-gc'), ('storage_gc_key', 'chiave-di-prova');
select private.invoke_storage_gc();
select is((select headers ->> 'x-gc-key' from net._calls), 'chiave-di-prova', 'con i segreti chiama l''Edge Function con x-gc-key');

select ok((select command like '%purge_expired_content%' and command like '%invoke_storage_gc%' and schedule = '*/5 * * * *'
             from cron.job where jobname = 'purge-expired-content'),
  'il job di pulizia gira ogni 5 minuti e poi chiama la pulizia dei file');
select ok(exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'),
  'chat_messages è nella publication Realtime');

select * from finish();
rollback;
