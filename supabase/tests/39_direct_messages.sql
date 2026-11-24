begin;
\ir helpers/setup.psql
select plan(71);

-- a = me; b = amico (a segue b, accettato); c = mi segue (accettato, direzione opposta); d = solo richiesta pending;
-- e = amico bloccato; f = sconosciuto
select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola') as b \gset
select tests.create_user('gatto.blu') as c \gset
select tests.create_user('panda.rosa') as d \gset
select tests.create_user('lupo.nero') as e \gset
select tests.create_user('orso.verde') as f \gset
select tests.follow(:'a', :'b');
select tests.follow(:'c', :'a');
select tests.follow(:'a', :'d', 'pending');
select tests.follow(:'a', :'e');

-- struttura ---------------------------------------------------------------------------------------------------------
select has_table('public', 'dm_threads', 'tabella thread');
select has_table('public', 'dm_messages', 'tabella messaggi');
select has_table('public', 'dm_reads', 'tabella letture');
select ok((select bool_and(c.relrowsecurity) from pg_class c where c.oid in ('public.dm_threads'::regclass, 'public.dm_messages'::regclass, 'public.dm_reads'::regclass)),
  'RLS attiva sulle tre tabelle');
select ok(not has_table_privilege('authenticated', 'public.dm_messages', 'insert')
      and not has_table_privilege('authenticated', 'public.dm_messages', 'update')
      and not has_table_privilege('authenticated', 'public.dm_messages', 'delete')
      and not has_table_privilege('authenticated', 'public.dm_threads', 'insert')
      and not has_table_privilege('authenticated', 'public.dm_threads', 'update')
      and not has_table_privilege('authenticated', 'public.dm_threads', 'delete')
      and not has_table_privilege('authenticated', 'public.dm_reads', 'select')
      and not has_table_privilege('authenticated', 'public.dm_reads', 'insert'),
  'nessuna scrittura diretta per authenticated, dm_reads chiusa');
select ok(not has_function_privilege('anon', 'public.send_dm(uuid, text)', 'execute')
      and not has_function_privilege('anon', 'public.open_dm_thread(text)', 'execute')
      and not has_function_privilege('anon', 'public.get_dm_threads(int)', 'execute')
      and not has_function_privilege('anon', 'public.get_dm_messages(uuid, timestamptz, int)', 'execute')
      and not has_function_privilege('anon', 'public.mark_dm_read(uuid)', 'execute')
      and not has_function_privilege('anon', 'public.get_dm_unread_count()', 'execute'),
  'anon non esegue le RPC dei DM');
select ok(exists (select 1 from cron.job where jobname = 'purge-expired-dms'), 'il job di purge è pianificato');
select ok(exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'dm_messages')
          or not exists (select 1 from pg_publication where pubname = 'supabase_realtime'),
  'dm_messages è nella publication Realtime (se esiste)');

-- scrittura diretta rifiutata
reset role;
select tests.authenticate_as(:'a');
select throws_ok($$ insert into public.dm_threads (user_a, user_b) values (auth.uid(), auth.uid()) $$, '42501', null, 'niente insert diretto sui thread');
select throws_ok($$ insert into public.dm_messages (thread_id, sender_id, text) values (gen_random_uuid(), auth.uid(), 'x') $$, '42501', null, 'niente insert diretto sui messaggi');

-- open_dm_thread ---------------------------------------------------------------------------------------------------
select lives_ok($$ select open_dm_thread('volpe.viola') $$, 'amico: apre il thread');
select open_dm_thread('@VOLPE.viola') as tab \gset
select is((select count(*)::int from (select user_a from public.dm_threads) x), 1, 'idempotente (anche con @ e maiuscole): un solo thread');
select open_dm_thread('gatto.blu') as tac \gset
select isnt(:'tab'::uuid, :'tac'::uuid, 'chi mi segue (direzione opposta) è comunque amico: thread diverso');
select throws_ok($$ select open_dm_thread('panda.rosa') $$, 'P0001', 'NOT_LINKED', 'richiesta pending non basta');
select throws_ok($$ select open_dm_thread('orso.verde') $$, 'P0001', 'NOT_LINKED', 'sconosciuto: NOT_LINKED');
select throws_ok($$ select open_dm_thread('nessuno.esiste') $$, 'P0001', 'NOT_LINKED', 'handle inesistente: stesso errore, non rivela nulla');
select throws_ok($$ select open_dm_thread('lince.rosso') $$, 'P0001', 'SELF', 'non con sé stessi');
reset role;
insert into public.blocks (blocker_id, blocked_id) values (:'e', :'a');
reset role;
select tests.authenticate_as(:'a');
select throws_ok($$ select open_dm_thread('lupo.nero') $$, 'P0001', 'NOT_LINKED', 'bloccato: NOT_LINKED, senza distinguerlo');
reset role;
select ok((select user_a < user_b from public.dm_threads where id = :'tab'), 'coppia ordinata (user_a < user_b)');

-- send_dm ---------------------------------------------------------------------------------------------------------
delete from private.notification_queue;
reset role;
select tests.authenticate_as(:'a');
select lives_ok(format($$ select * from send_dm(%L, '  ciao  ') $$, :'tab'), 'invio ok');
select throws_ok(format($$ select * from send_dm(%L, '   ') $$, :'tab'), 'P0001', 'INVALID_TEXT', 'testo vuoto rifiutato');
select throws_ok(format($$ select * from send_dm(%L, null) $$, :'tab'), 'P0001', 'INVALID_TEXT', 'testo nullo rifiutato');
select throws_ok(format($$ select * from send_dm(%L, repeat('x', 1001)) $$, :'tab'), 'P0001', 'INVALID_TEXT', 'oltre 1000 caratteri rifiutato');
select lives_ok(format($$ select * from send_dm(%L, repeat('x', 1000)) $$, :'tab'), '1000 caratteri ok');
reset role;
select tests.authenticate_as(:'f');
select throws_ok(format($$ select * from send_dm(%L, 'intruso') $$, :'tab'), 'P0001', 'NOT_LINKED', 'un non membro non scrive');
select is((select count(*)::int from get_dm_messages(:'tab')), 0, 'e non legge');
select is((select count(*)::int from public.dm_messages), 0, 'né vede i messaggi via select (RLS)');
reset role;
select is((select text from public.dm_messages order by created_at, id limit 1), 'ciao', 'il testo è salvato senza spazi esterni');
select ok((select last_message_at is not null from public.dm_threads where id = :'tab'), 'last_message_at aggiornato');

-- push: una riga per il destinatario, mai il testo
select is((select count(*)::int from private.notification_queue where user_id = :'b' and category = 'dm' and group_key = 'dm:' || :'tab'), 2,
  'una riga in coda per messaggio al destinatario, stesso group_key');
select is((select count(*)::int from private.notification_queue where user_id = :'a'), 0, 'nessuna push al mittente');
select is((select count(*)::int from private.notification_queue where params::text like '%ciao%' or params::text like '%xxxx%'), 0,
  'la coda non contiene il testo');
select is((select body from private.render_notification('it', 'dm_message', 1, jsonb_build_object('handle', 'lince.rosso', 'thread_id', :'tab'))),
  '@lince.rosso ti ha scritto', 'testo IT singolo');
select is((select body from private.render_notification('en', 'dm_message', 1, '{"handle":"lince.rosso"}')), '@lince.rosso sent you a message', 'testo EN singolo');
select is((select body from private.render_notification('it', 'dm_message', 3, '{"handle":"lince.rosso"}')), '3 nuovi messaggi da @lince.rosso', 'coalescing IT');
select is((select body from private.render_notification('en', 'dm_message', 3, '{"handle":"lince.rosso"}')), '3 new messages from @lince.rosso', 'coalescing EN');
select is((select url from private.render_notification('it', 'dm_message', 1, jsonb_build_object('handle', 'x', 'thread_id', :'tab'))),
  'rightplace://dm/' || :'tab', 'deep link al thread');
select is(private.push_channel('dm'), 'messaggi', 'canale Android dedicato');
select is(private.push_channel('support'), 'supporto', 'gli altri canali non cambiano');

update public.profiles set notification_prefs = notification_prefs || '{"dm": false}' where id = :'b';
delete from private.notification_queue;
reset role;
select tests.authenticate_as(:'a');
select send_dm(:'tab', 'di nuovo');
reset role;
select is((select count(*)::int from private.notification_queue where user_id = :'b'), 0, 'categoria dm spenta: nessuna push');
update public.profiles set notification_prefs = notification_prefs || '{"dm": true}' where id = :'b';
reset role;
select tests.authenticate_as(:'b');
select lives_ok($$ select set_my_notification_prefs('{"dm": false}') $$, 'la chiave dm è accettata nelle preferenze');
select is((select get_my_notification_prefs() ->> 'dm'), 'false', 'e salvata');
reset role;

-- rate limit
reset role;
select tests.authenticate_as(:'c');
select send_dm(:'tac', 'm' || i) from generate_series(1, 29) i;
select lives_ok(format($$ select * from send_dm(%L, 'trentesimo') $$, :'tac'), 'il 30° messaggio al minuto passa');
select throws_ok(format($$ select * from send_dm(%L, 'trentunesimo') $$, :'tac'), 'P0001', 'RATE_LIMITED', 'il 31° è limitato');
reset role;
delete from public.dm_messages where thread_id = :'tac';

-- lettura, non letto, conteggio -------------------------------------------------------------------------------------
reset role;
select tests.authenticate_as(:'b');
select is((select count(*)::int from get_dm_messages(:'tab')), 3, 'b legge i 3 messaggi del thread');
select ok((select sender_is_me = false from get_dm_messages(:'tab') limit 1), 'sender_is_me riflette il chiamante');
select is((select count(*)::int from get_dm_messages(:'tab', null, 2)), 2, 'p_limit rispettato');
select is((select unread from get_dm_threads() where thread_id = :'tab'), true, 'thread non letto');
select is((select get_dm_unread_count()), 1, 'badge: 1 conversazione non letta');
select is((select other_handle from get_dm_threads() where thread_id = :'tab'), 'lince.rosso', 'handle dell''altro');
select is((select char_length(last_text) from get_dm_threads() where thread_id = :'tab'), 8, 'anteprima: ultimo messaggio');
select lives_ok(format($$ select mark_dm_read(%L) $$, :'tab'), 'mark_dm_read');
select is((select unread from get_dm_threads() where thread_id = :'tab'), false, 'letto');
select is((select get_dm_unread_count()), 0, 'badge a zero');
reset role;
select tests.authenticate_as(:'a');
select is((select unread from get_dm_threads() where thread_id = :'tab'), false, 'i miei messaggi non sono mai "non letti" per me');
select is((select last_sender_is_me from get_dm_threads() where thread_id = :'tab'), true, 'last_sender_is_me');
select is((select count(*)::int from get_dm_threads() where thread_id = :'tac'), 0, 'un thread senza messaggi non è in casella');

-- un blocco chiude subito ----------------------------------------------------------------------------------------
reset role;
insert into public.blocks (blocker_id, blocked_id) values (:'b', :'a');
reset role;
select tests.authenticate_as(:'a');
select throws_ok(format($$ select * from send_dm(%L, 'dopo il blocco') $$, :'tab'), 'P0001', 'NOT_LINKED', 'dopo un blocco non si scrive');
select is((select count(*)::int from get_dm_messages(:'tab')), 0, 'né si legge');
select is((select count(*)::int from get_dm_threads()), 0, 'e il thread sparisce dalla casella');
select is((select count(*)::int from public.dm_messages), 0, 'anche via select/Realtime (RLS)');
reset role;
delete from public.blocks where blocker_id = :'b';
-- la caduta del follow chiude allo stesso modo
delete from public.follows where follower_id = :'a' and followee_id = :'b';
reset role;
select tests.authenticate_as(:'a');
select throws_ok(format($$ select * from send_dm(%L, 'senza legame') $$, :'tab'), 'P0001', 'NOT_LINKED', 'senza follow accettato non si scrive');
reset role;

-- segnalazione ---------------------------------------------------------------------------------------------------
select id as mid from public.dm_messages where thread_id = :'tab' order by created_at, id limit 1 \gset
reset role;
select tests.authenticate_as(:'b');
select lives_ok(format($$ select report('dm', %L, 'molesto') $$, :'mid'), 'un membro segnala un messaggio del thread');
reset role;
select tests.authenticate_as(:'f');
select throws_ok(format($$ select report('dm', %L, 'x') $$, :'mid'), 'P0001', 'INVALID_ARGUMENT', 'un non membro non può segnalare');
select throws_ok($$ select report('dm', gen_random_uuid(), 'x') $$, 'P0001', 'INVALID_ARGUMENT', 'messaggio inesistente');
reset role;

-- purge a 7 giorni ----------------------------------------------------------------------------------------------
update public.dm_messages set created_at = now() - interval '8 days' where id = :'mid';
select tests.follow(:'a', :'b');
reset role;
select tests.authenticate_as(:'a');
select is((select count(*)::int from get_dm_messages(:'tab') where id = :'mid'), 0, 'dopo 7 giorni il messaggio non è più leggibile (anche prima del job)');
reset role;
select private.purge_expired_dms();
select is((select count(*)::int from public.dm_messages where id = :'mid'), 0, 'il job cancella i messaggi oltre 7 giorni');
select is((select count(*)::int from public.dm_threads where id = :'tab'), 1, 'il thread con messaggi recenti resta');
delete from public.dm_messages where thread_id = :'tab';
update public.dm_threads set created_at = now() - interval '2 hours' where id = :'tab';
select private.purge_expired_dms();
select is((select count(*)::int from public.dm_threads where id = :'tab'), 0, 'i thread senza messaggi spariscono');

-- cancellazione account: i thread vanno via per cascade ---------------------------------------------------------
reset role;
select tests.authenticate_as(:'a');
select open_dm_thread('gatto.blu') as tac2 \gset
reset role;
select is((select count(*)::int from public.dm_threads where id = :'tac2'), 1, 'thread presente prima della cancellazione');
delete from auth.users where id = :'a';
select is((select count(*)::int from public.dm_threads where :'a'::uuid in (user_a, user_b)), 0, 'cancellando l''utente i thread spariscono');

select * from finish();
rollback;
