begin;
\ir helpers/setup.psql
select plan(24);

select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola') as b \gset
select gen_random_uuid() as shot \gset

-- bucket ----------------------------------------------------------------------------------------------------
select is((select count(*)::int from storage.buckets where id = 'feedback' and not public), 1,
  'il bucket feedback è privato');
select tests.authenticate_as(:'a');
select lives_ok(format($$ insert into storage.objects (bucket_id, name, owner) values ('feedback', %L, %L) $$,
  :'a' || '/' || :'shot' || '.jpg', :'a'), 'upload nel proprio prefisso');
select throws_ok(format($$ insert into storage.objects (bucket_id, name, owner) values ('feedback', %L, %L) $$,
  gen_random_uuid() || '/x.jpg', :'a'), '42501', null, 'upload nel prefisso di un altro rifiutato');
select is((select count(*)::int from storage.objects where bucket_id = 'feedback'), 0,
  'nessuna lettura diretta degli screenshot');

-- submit_feedback ---------------------------------------------------------------------------------------------
select lives_ok(format($$ select submit_feedback(5, '  Bella app  ', '/venue/[id]', %L, '1.0.0', 'ios', 'it') $$,
  :'a' || '/' || :'shot' || '.jpg'), 'invio con screenshot');
select lives_ok($$ select submit_feedback(3, '', '/(tabs)/map', null, null, 'android', 'en') $$,
  'invio senza screenshot né commento');
select throws_ok($$ select submit_feedback(0, 'x', '/a', null, null, 'ios', 'it') $$, 'P0001', 'INVALID_RATING',
  'voto 0 rifiutato');
select throws_ok($$ select submit_feedback(6, 'x', '/a', null, null, 'ios', 'it') $$, 'P0001', 'INVALID_RATING',
  'voto 6 rifiutato');
select throws_ok($$ select submit_feedback(null, 'x', '/a', null, null, 'ios', 'it') $$, 'P0001', 'INVALID_RATING',
  'voto obbligatorio');
select throws_ok(format($$ select submit_feedback(4, %L, '/a', null, null, 'ios', 'it') $$, repeat('x', 1001)),
  'P0001', 'INVALID_FEEDBACK_COMMENT', 'commento oltre 1000 caratteri rifiutato');
select throws_ok(format($$ select submit_feedback(4, 'x', '/a', %L, null, 'ios', 'it') $$,
  :'b' || '/' || gen_random_uuid() || '.jpg'), 'P0001', 'INVALID_SCREENSHOT', 'path di un altro utente rifiutato');
select throws_ok(format($$ select submit_feedback(4, 'x', '/a', %L, null, 'ios', 'it') $$,
  :'a' || '/../x.jpg'), 'P0001', 'INVALID_SCREENSHOT', 'path non conforme rifiutato');
select throws_ok($$ select submit_feedback(4, 'x', '/a', null, null, 'windows', 'it') $$, 'P0001', 'INVALID_PLATFORM',
  'piattaforma sconosciuta rifiutata');
select throws_ok($$ select submit_feedback(4, 'x', null, null, null, 'ios', 'it') $$, 'P0001', 'INVALID_SCREEN',
  'schermata obbligatoria');

reset role;
select is((select comment from feedback where screenshot_path is not null and user_id = :'a'), 'Bella app',
  'il commento è ripulito dagli spazi');
select is((select count(*)::int from feedback where user_id = :'a'), 2, 'solo gli invii validi sono salvati');

-- rate limit ----------------------------------------------------------------------------------------------------
select tests.authenticate_as(:'a');
select lives_ok($$ select submit_feedback(4, 'x', '/a', null, null, 'ios', 'it') from generate_series(1, 8) $$,
  'fino a 10 al giorno');
select throws_ok($$ select submit_feedback(4, 'x', '/a', null, null, 'ios', 'it') $$, 'P0001', 'FEEDBACK_LIMIT',
  'l''undicesimo in un giorno è rifiutato');

-- privacy ----------------------------------------------------------------------------------------------------------
select throws_ok($$ select * from feedback $$, '42501', null, 'gli utenti non leggono i feedback');
select throws_ok($$ insert into feedback (user_id, rating, screen, platform) values (auth.uid(), 5, '/a', 'ios') $$,
  '42501', null, 'nessun insert diretto');
reset role;
set local role anon;
select throws_ok($$ select submit_feedback(4, 'x', '/a', null, null, 'ios', 'it') $$, '42501', null, 'anon non esegue');
reset role;

-- retention -----------------------------------------------------------------------------------------------------------
update feedback set created_at = now() - interval '181 days' where user_id = :'a' and screenshot_path is not null;
select private.purge_old_feedback();
select is((select count(*)::int from feedback where user_id = :'a' and created_at < now() - interval '180 days'), 0,
  'i feedback oltre 180 giorni sono cancellati');
select is((select count(*)::int from private.storage_deletion_queue
            where bucket_id = 'feedback' and object_path = :'a' || '/' || :'shot' || '.jpg'), 1,
  'lo screenshot è in coda di cancellazione');

-- account deletion ------------------------------------------------------------------------------------------------------
select gen_random_uuid() as shot_b \gset
select tests.authenticate_as(:'b');
select submit_feedback(2, 'x', '/a', :'b' || '/' || :'shot_b' || '.jpg', null, 'ios', 'it');
select delete_my_account();
reset role;
select ok(
  not exists (select 1 from feedback where user_id = :'b')
  and exists (select 1 from private.storage_deletion_queue where bucket_id = 'feedback' and object_path = :'b' || '/' || :'shot_b' || '.jpg'),
  'eliminando l''account spariscono i feedback e lo screenshot è in coda');

select * from finish();
rollback;
