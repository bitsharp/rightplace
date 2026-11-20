begin;
\ir helpers/setup.psql
select plan(35);

select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola') as b \gset
select tests.create_user('gufo.blu') as s1 \gset
select tests.create_user('orso.nero') as s2 \gset
select gen_random_uuid() as shot \gset
update public.profiles set is_support = true where id in (:'s1', :'s2');
update public.profiles set locale = 'en' where id = :'s2';
insert into public.blocks (blocker_id, blocked_id) values (:'s1', :'a');

-- is_support non è dei client -----------------------------------------------------------------------------------
select tests.authenticate_as(:'a');
select throws_ok($$ update public.profiles set is_support = true where id = auth.uid() $$, '42501', null,
  'un utente non può rendersi support');
reset role;
select is((select count(*)::int from information_schema.columns where table_schema = 'public'
            and table_name = 'public_profiles' and column_name = 'is_support'), 0,
  'is_support non è nella vista pubblica dei profili');
select tests.authenticate_as(:'b');
select is((select count(*)::int from public.profiles where id = :'s1'), 0, 'gli altri non leggono il profilo di un support');
reset role;

-- permessi ---------------------------------------------------------------------------------------------------------
select ok(not has_function_privilege('anon', 'public.get_support_feedback(timestamptz, int)', 'execute')
  and not has_function_privilege('anon', 'public.get_feedback_screenshot_paths(uuid[])', 'execute'),
  'anon non esegue le RPC del supporto');
select ok(not has_function_privilege('authenticated', 'private.notify_support_of_feedback()', 'execute'),
  'il trigger non è eseguibile dai client');

-- notifica ---------------------------------------------------------------------------------------------------------
delete from private.notification_queue;
select tests.authenticate_as(:'a');
select submit_feedback(4, 'COMMENTO-SEGRETO', '/venue/[id]', :'a' || '/' || :'shot' || '.jpg', '1.0.0', 'ios', 'it');
reset role;
select is((select array_agg(user_id::text order by user_id::text) from private.notification_queue where category = 'support'),
  (select array_agg(x order by x) from unnest(array[:'s1'::text, :'s2'::text]) x),
  'una riga in coda per ogni utente support (anche se ha bloccato l''autore), nessuna per gli altri');
select is((select count(*)::int from private.notification_queue where user_id = :'b'), 0, 'chi non è support non riceve nulla');
select is((select count(*)::int from private.notification_queue where params::text like '%SEGRETO%'), 0,
  'la coda non contiene il commento');
select is((select count(distinct group_key)::int from private.notification_queue where category = 'support'), 1, 'stesso group_key');

-- il supporto che scrive non notifica sé stesso
select tests.authenticate_as(:'s1');
select submit_feedback(5, 'x', '/map', null, null, 'android', 'it');
reset role;
select is((select count(*)::int from private.notification_queue where user_id = :'s1'), 1, 'nessuna push a sé stessi');
select is((select count(*)::int from private.notification_queue where user_id = :'s2'), 2, 'ma gli altri support sì');

-- preferenza spenta
update public.profiles set notification_prefs = notification_prefs || '{"support": false}' where id = :'s2';
select tests.authenticate_as(:'b');
select submit_feedback(1, 'x', '/map', null, null, 'android', 'it');
reset role;
select is((select count(*)::int from private.notification_queue where user_id = :'s2'), 2, 'categoria support spenta: nessuna nuova riga');
update public.profiles set notification_prefs = notification_prefs || '{"support": true}' where id = :'s2';

-- testo e dispatch -------------------------------------------------------------------------------------------------
select is((select title || '|' || body || '|' || url from private.render_notification('it', 'feedback_new', 1, '{"rating":4,"screen":"/venue/[id]"}')),
  'RightPlace|Nuovo feedback ★★★★☆ su /venue/[id]|rightplace://support/feedback', 'testo italiano');
select is((select body from private.render_notification('en', 'feedback_new', 1, '{"rating":2,"screen":"/map"}')),
  'New feedback ★★☆☆☆ on /map', 'testo inglese');
select is((select body from private.render_notification('it', 'feedback_new', 3, '{"rating":2,"screen":"/map"}')), '3 nuovi feedback', 'coalescing italiano');
select is((select body from private.render_notification('en', 'feedback_new', 3, '{"rating":2,"screen":"/map"}')), '3 new feedback', 'coalescing inglese');
select is(private.push_channel('support'), 'supporto', 'canale push dedicato');

delete from net._calls;
delete from vault.decrypted_secrets;
insert into vault.decrypted_secrets (name, decrypted_secret) values
  ('send_push_url', 'https://example.test/functions/v1/send-push'), ('send_push_key', 'chiave-push');
select private.dispatch_notifications();
select is((select count(*)::int from net._calls where body::text like '%rightplace://support/feedback%'), 1, 'una chiamata a send-push');
select ok((select body::text not like '%SEGRETO%' and body::text not like '%.jpg%' from net._calls), 'la push non contiene commento né screenshot');
select is((select count(*)::int from jsonb_array_elements((select body -> 'messages' from net._calls)) m
            where m ->> 'channel_id' = 'supporto'), 2, 'un messaggio per ogni support');
select is((select count(*)::int from jsonb_array_elements((select body -> 'messages' from net._calls)) m
            where m -> 'user_ids' = jsonb_build_array(:'s2'::text) and m ->> 'body' = '2 new feedback'), 1,
  'coalescing nella lingua dell''utente (s2: 2 feedback in coda, en)');

-- un ex support non riceve ciò che era in coda
insert into private.notification_queue (user_id, category, kind, group_key, params)
values (:'b', 'support', 'feedback_new', 'feedback', '{"rating":3,"screen":"/map"}');
select private.dismiss_disabled_notifications();
select is((select count(*)::int from private.notification_queue where user_id = :'b' and sent_at is null), 0,
  'righe support di chi non è (più) support vengono scartate');

-- get_support_feedback ---------------------------------------------------------------------------------------------
select tests.authenticate_as(:'a');
select throws_ok($$ select * from public.get_support_feedback() $$, 'P0001', 'NOT_SUPPORT', 'un utente normale non legge i feedback');
select throws_ok($$ select * from public.get_feedback_screenshot_paths(array[gen_random_uuid()]) $$, 'P0001', 'NOT_SUPPORT',
  'né i path degli screenshot');
reset role;
select id as fid4 from public.feedback where rating = 4 \gset
select array_agg(id) as all_ids from public.feedback \gset
select tests.authenticate_as(:'s2');
select is((select count(*)::int from public.get_support_feedback()), 3, 'il support legge tutti i feedback');
select is((select array_agg(n.name::text order by n.i) from pg_proc p
             cross join lateral unnest(p.proargnames) with ordinality n(name, i)
            where p.proname = 'get_support_feedback' and p.pronamespace = 'public'::regnamespace and p.proargmodes[n.i] = 't'),
  array['id','rating','comment','screen','has_screenshot','app_version','platform','locale','created_at','author_handle'],
  'colonne: niente email né user_id');
select is((select comment from public.get_support_feedback() where rating = 4), 'COMMENTO-SEGRETO', 'commento intero');
select is((select author_handle from public.get_support_feedback() where rating = 4), 'lince.rosso', 'handle dell''autore');
select is((select has_screenshot from public.get_support_feedback() where rating = 4), true, 'has_screenshot');
select is((select count(*)::int from public.get_support_feedback(null, 2)), 2, 'limite');
select is((select count(*)::int from public.get_support_feedback(now() - interval '1 day', 30)), 0, 'p_before: solo i più vecchi');
select is((select count(*)::int from public.get_support_feedback(now() + interval '1 day', 30)), 3, 'p_before nel futuro: tutti');
select is((select feedback_id from public.get_feedback_screenshot_paths(array[:'fid4'::uuid])), :'fid4'::uuid,
  'path dello screenshot al support');
select is((select count(*)::int from public.get_feedback_screenshot_paths(:'all_ids'::uuid[])), 1,
  'solo i feedback con screenshot');
select throws_ok($$ select * from public.get_feedback_screenshot_paths((select array_agg(gen_random_uuid()) from generate_series(1, 51))) $$,
  'P0001', 'INVALID_ARGUMENT', 'massimo 50 id');
reset role;

select * from finish();
rollback;
