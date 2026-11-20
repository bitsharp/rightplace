begin;
\ir helpers/setup.psql
select plan(67);

-- a = owner of the avatar; f = accepted follower of a; p = pending follower; s = stranger; k = blocked by a (still an
-- accepted follower, to prove that the block wins); m = a follower who blocked a; g = a follows g (a is not followed back)
select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola') as f \gset
select tests.create_user('gatto.blu') as p \gset
select tests.create_user('panda.rosa') as s \gset
select tests.create_user('lupo.nero') as k \gset
select tests.create_user('orso.verde') as m \gset
select tests.create_user('tigre.arancio') as g \gset
select tests.follow(:'f', :'a');
select tests.follow(:'p', :'a', 'pending');
select tests.follow(:'k', :'a');
select tests.follow(:'m', :'a');
select tests.follow(:'a', :'g');
insert into blocks (blocker_id, blocked_id) values (:'a', :'k'), (:'m', :'a');
select gen_random_uuid() as pic1 \gset
select gen_random_uuid() as pic2 \gset
select gen_random_uuid() as pic_g \gset
select tests.make_venue('Test Club') as v \gset

-- bucket ----------------------------------------------------------------------------------------------------
select is((select count(*)::int from storage.buckets
            where id = 'avatars' and not public and file_size_limit = 2097152 and allowed_mime_types = array['image/jpeg']), 1,
  'il bucket avatars è privato, 2 MB, solo jpeg');
reset role;
select tests.authenticate_as(:'a');
select lives_ok(format($$ insert into storage.objects (bucket_id, name, owner) values ('avatars', %L, %L) $$,
  :'a' || '/' || :'pic1' || '.jpg', :'a'), 'upload nel proprio prefisso');
select throws_ok(format($$ insert into storage.objects (bucket_id, name, owner) values ('avatars', %L, %L) $$,
  :'f' || '/x.jpg', :'a'), '42501', null, 'upload nel prefisso di un altro rifiutato');
select is((select count(*)::int from storage.objects where bucket_id = 'avatars'), 0,
  'nessuna lettura diretta degli avatar');

-- set_avatar / clear_avatar -------------------------------------------------------------------------------------
select lives_ok(format($$ select set_avatar(%L) $$, :'a' || '/' || :'pic1' || '.jpg'), 'set_avatar col proprio path');
select throws_ok(format($$ select set_avatar(%L) $$, :'f' || '/' || :'pic2' || '.jpg'), 'P0001', 'INVALID_AVATAR_PATH',
  'il path di un altro utente è rifiutato');
select throws_ok(format($$ select set_avatar(%L) $$, :'a' || '/../' || :'pic2' || '.jpg'), 'P0001', 'INVALID_AVATAR_PATH',
  'un path con ../ è rifiutato');
select throws_ok(format($$ select set_avatar(%L) $$, :'a' || '/' || :'pic2' || '.png'), 'P0001', 'INVALID_AVATAR_PATH',
  'solo .jpg');
select throws_ok($$ select set_avatar(null) $$, 'P0001', 'INVALID_AVATAR_PATH', 'path nullo rifiutato');
select throws_ok($$ select set_avatar('abc.jpg') $$, 'P0001', 'INVALID_AVATAR_PATH', 'path senza prefisso rifiutato');
reset role;
select is((select avatar_path from profiles where id = :'a'), :'a' || '/' || :'pic1' || '.jpg', 'il path è salvato');
select is((select count(*)::int from private.storage_deletion_queue where bucket_id = 'avatars'), 0,
  'la prima foto non accoda nulla');

reset role;
select tests.authenticate_as(:'a');
select lives_ok(format($$ select set_avatar(%L) $$, :'a' || '/' || :'pic2' || '.jpg'), 'sostituzione della foto');
reset role;
select is((select avatar_path from profiles where id = :'a'), :'a' || '/' || :'pic2' || '.jpg', 'il nuovo path è salvato');
select is((select count(*)::int from private.storage_deletion_queue
            where bucket_id = 'avatars' and object_path = :'a' || '/' || :'pic1' || '.jpg'), 1,
  'il file precedente è in coda di cancellazione');
reset role;
select tests.authenticate_as(:'a');
select lives_ok(format($$ select set_avatar(%L) $$, :'a' || '/' || :'pic2' || '.jpg'), 'lo stesso path due volte non fallisce');
reset role;
select is((select count(*)::int from private.storage_deletion_queue where bucket_id = 'avatars'), 1,
  'e non accoda il file ancora in uso');

-- visibility (principles 1 and 6) ---------------------------------------------------------------------------------
reset role;
select tests.authenticate_as(:'a');
select is((select avatar_path from get_avatar_paths(array[:'a'::uuid])), :'a' || '/' || :'pic2' || '.jpg',
  'io vedo la mia foto');
reset role;
select tests.authenticate_as(:'f');
select is((select avatar_path from get_avatar_paths(array[:'a'::uuid])), :'a' || '/' || :'pic2' || '.jpg',
  'un follower accettato vede la foto');
reset role;
select tests.authenticate_as(:'p');
select is((select count(*)::int from get_avatar_paths(array[:'a'::uuid])), 0, 'una richiesta pending non sblocca la foto');
reset role;
select tests.authenticate_as(:'s');
select is((select count(*)::int from get_avatar_paths(array[:'a'::uuid])), 0, 'uno sconosciuto non la vede');
reset role;
select tests.authenticate_as(:'k');
select is((select count(*)::int from get_avatar_paths(array[:'a'::uuid])), 0,
  'chi ho bloccato non la vede, anche se mi seguiva');
reset role;
select tests.authenticate_as(:'m');
select is((select count(*)::int from get_avatar_paths(array[:'a'::uuid])), 0,
  'chi mi ha bloccato non la vede, anche se mi segue');
reset role;
select tests.authenticate_as(:'g');
select is((select count(*)::int from get_avatar_paths(array[:'a'::uuid])), 0,
  'seguire non basta: chi è seguito da me ma non mi segue non vede la mia foto (g non segue a)');
reset role;
select tests.authenticate_as(:'a');
select is((select count(*)::int from get_avatar_paths(array[:'g'::uuid])), 0, 'g non ha una foto: nessuna riga');
reset role;
update profiles set avatar_path = :'g' || '/' || :'pic_g' || '.jpg' where id = :'g';
reset role;
select tests.authenticate_as(:'a');
select is((select avatar_path from get_avatar_paths(array[:'g'::uuid])), :'g' || '/' || :'pic_g' || '.jpg',
  'seguo g con follow accettato: vedo la sua foto');
select is((select count(*)::int from get_avatar_paths(array[:'a'::uuid, :'g'::uuid, :'f'::uuid, :'s'::uuid])), 2,
  'una richiesta mista restituisce solo i path visibili');
select throws_ok(format($$ select * from get_avatar_paths(%L::uuid[]) $$,
  (select array_agg(gen_random_uuid())::text from generate_series(1, 101))), 'P0001', 'INVALID_ARGUMENT',
  'oltre 100 id sono rifiutati');
select is((select count(*)::int from get_avatar_paths(null)), 0, 'array nullo: nessun risultato');
reset role;
update profiles set deleted_at = now() where id = :'g';
reset role;
select tests.authenticate_as(:'a');
select is((select count(*)::int from get_avatar_paths(array[:'g'::uuid])), 0, 'un profilo cancellato non ha foto visibile');
reset role;
update profiles set deleted_at = null where id = :'g';

-- the photo never leaks in other reads ----------------------------------------------------------------------------
reset role;
select tests.authenticate_as(:'f');
select is((select count(*)::int from profiles where id = :'a'), 0, 'il profilo altrui non è leggibile direttamente');
select is((select count(*)::int from public_profiles where id = :'a'), 1, 'ma la vista pubblica resta (senza foto)');
select ok(not exists (select 1 from information_schema.columns where table_name = 'public_profiles' and column_name = 'avatar_path'),
  'public_profiles non espone avatar_path');
reset role;
select tests.authenticate_as(:'a');
select is((select avatar_path from profiles where id = :'a'), :'a' || '/' || :'pic2' || '.jpg', 'il proprio profilo lo legge');
select throws_ok(format($$ update profiles set avatar_path = %L where id = auth.uid() $$, :'f' || '/' || :'pic1' || '.jpg'),
  '42501', null, 'nessun update diretto di avatar_path');

-- get_profile_summary -----------------------------------------------------------------------------------------------
-- a has: followers f (accepted), k (blocked by a), m (blocked a); pending p; follows g
reset role;
select tests.follow(:'s', :'f');
select tests.make_declaration(:'a', :'v', 'going');
select tests.make_post(:'a', :'v', now() - interval '1 hour', now() + interval '6 days') as post1 \gset
select tests.make_post(:'a', :'v', now() - interval '2 hours', now() + interval '5 days') as post2 \gset
select tests.make_post(:'a', :'v', now() - interval '9 days', now() - interval '2 days') as post_old \gset
select tests.make_post(:'a', :'v', now() + interval '3 hours', now() + interval '7 days') as post_future \gset

reset role;
select tests.authenticate_as(:'a');
select is((select (followers_count, following_count, posts_count, is_me, follow_state)::text from get_profile_summary(:'a')),
  '(1,1,3,t,none)', 'il mio riepilogo: follower, seguiti, post attivi (anche quello non ancora visibile ai follower), is_me');
select is((select handle from get_profile_summary(:'a')), 'lince.rosso', 'handle');
reset role;
select tests.authenticate_as(:'f');
select is((select (followers_count, following_count, posts_count, is_me, follow_state)::text from get_profile_summary(:'a')),
  '(1,1,2,f,accepted)', 'un follower accettato vede i conteggi e i soli post nella finestra');
reset role;
select tests.authenticate_as(:'p');
select is((select (followers_count, following_count, posts_count, is_me, follow_state)::text from get_profile_summary(:'a')),
  '(,,,f,pending)', 'pending: conteggi null, stato "pending"');
select is((select age_band from get_profile_summary(:'a')), '25-34', 'restano i campi pubblici (fascia d''età)');
reset role;
select tests.authenticate_as(:'s');
select is((select (followers_count, following_count, posts_count, is_me, follow_state)::text from get_profile_summary(:'a')),
  '(,,,f,none)', 'uno sconosciuto vede solo i campi pubblici');
select is((select (handle, gender, is_creator)::text from get_profile_summary(:'a')), '(lince.rosso,female,f)',
  'handle, genere e flag creator sono pubblici');
reset role;
select tests.authenticate_as(:'k');
select is((select count(*)::int from get_profile_summary(:'a')), 0, 'bloccato da me: profilo non trovato');
reset role;
select tests.authenticate_as(:'m');
select is((select count(*)::int from get_profile_summary(:'a')), 0, 'chi mi ha bloccato: profilo non trovato');
reset role;
select tests.authenticate_as(:'a');
select is((select count(*)::int from get_profile_summary(gen_random_uuid())), 0, 'utente inesistente: nessuna riga');
select is((select count(*)::int from get_profile_summary(null)), 0, 'id nullo: nessuna riga');
select ok(not exists (select 1 from unnest(array['email', 'birth_date', 'avatar_path', 'location']) c
  where c in (select unnest(proargnames) from pg_proc where proname = 'get_profile_summary')),
  'il riepilogo non restituisce email, data di nascita, posizione né il path della foto');

-- get_user_posts ----------------------------------------------------------------------------------------------------
reset role;
select tests.authenticate_as(:'a');
select is((select count(*)::int from get_user_posts(:'a')), 3, 'miei post attivi: 3 (scaduto escluso)');
select is((select array_agg(post_id) from get_user_posts(:'a')), array[:'post_future'::uuid, :'post1'::uuid, :'post2'::uuid],
  'dal più recente');
reset role;
select tests.authenticate_as(:'f');
select is((select array_agg(post_id) from get_user_posts(:'a')), array[:'post1'::uuid, :'post2'::uuid],
  'un follower vede solo i post già nella finestra, mai quelli scaduti o futuri');
select is((select count(*)::int from get_user_posts(:'a') where has_photo), 0, 'has_photo riflette la presenza della foto');
reset role;
select tests.authenticate_as(:'p');
select is((select count(*)::int from get_user_posts(:'a')), 0, 'pending: nessun post');
reset role;
select tests.authenticate_as(:'s');
select is((select count(*)::int from get_user_posts(:'a')), 0, 'sconosciuto: nessun post');
reset role;
select tests.authenticate_as(:'k');
select is((select count(*)::int from get_user_posts(:'a')), 0, 'bloccato: nessun post');
reset role;
select tests.authenticate_as(:'f');
select is((select array_agg(post_id) from get_user_posts(:'a', (select visible_from from posts where id = :'post1'), :'post1', 30)),
  array[:'post2'::uuid], 'il cursore composto continua dopo l''ultimo post letto');
select is((select count(*)::int from get_user_posts(:'a', null, null, 1)), 1, 'il limite è rispettato');
select is((select count(*)::int from get_user_posts(:'a', null, null, 1000)), 2, 'il limite è comunque finito');

-- anon / privileges ---------------------------------------------------------------------------------------------------
reset role;
set local role anon;
select throws_ok($$ select set_avatar('x') $$, '42501', null, 'anon non esegue set_avatar');
select throws_ok($$ select clear_avatar() $$, '42501', null, 'anon non esegue clear_avatar');
select throws_ok($$ select * from get_avatar_paths(array[gen_random_uuid()]) $$, '42501', null, 'anon non esegue get_avatar_paths');
select throws_ok($$ select * from get_profile_summary(gen_random_uuid()) $$, '42501', null, 'anon non esegue get_profile_summary');
select throws_ok($$ select * from get_user_posts(gen_random_uuid()) $$, '42501', null, 'anon non esegue get_user_posts');
reset role;
reset role;
select tests.authenticate_as(:'f');
select throws_ok($$ select private.can_see_avatar(auth.uid(), auth.uid()) $$, '42501', null,
  'l''helper privato non è eseguibile dai client');

-- clear and account deletion ---------------------------------------------------------------------------------------------
reset role;
select tests.authenticate_as(:'a');
select lives_ok($$ select clear_avatar() $$, 'clear_avatar');
reset role;
select is((select avatar_path from profiles where id = :'a'), null, 'il path è azzerato');
select is((select count(*)::int from private.storage_deletion_queue
            where bucket_id = 'avatars' and object_path = :'a' || '/' || :'pic2' || '.jpg'), 1, 'e il file è accodato');
reset role;
select tests.authenticate_as(:'g');
select delete_my_account();
reset role;
select ok(
  (select avatar_path from profiles where id = :'g') is null
  and exists (select 1 from private.storage_deletion_queue where bucket_id = 'avatars' and object_path = :'g' || '/' || :'pic_g' || '.jpg'),
  'eliminare l''account azzera la foto e la accoda per la cancellazione');

select * from finish();
rollback;
