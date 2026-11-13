begin;
\ir helpers/setup.psql
select plan(115);

grant usage on schema tests to authenticated;
grant execute on all functions in schema tests to authenticated;

create function tests.make_event(p_creator uuid, p_venue uuid, p_name text default 'Serata')
returns uuid language sql as $$
  insert into public.events (creator_id, venue_id, name, starts_at, ends_at)
  values (p_creator, p_venue, p_name, now() + interval '1 day', now() + interval '1 day 6 hours') returning id
$$;
create function tests.make_event_crowd(p_event uuid, p_count int, p_intent text default 'going')
returns void language plpgsql as $$
begin
  for i in 1..p_count loop
    insert into public.declarations (user_id, event_id, intent)
    values (tests.create_user(tests.unique_handle('crowd')), p_event, p_intent);
  end loop;
end $$;

select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.blu') as b \gset
select tests.create_user('gatto.nero') as c \gset
select tests.create_user('orso.verde') as d \gset
select tests.create_user('cane.giallo') as e \gset
select tests.create_user('lupo.grigio') as f \gset
select tests.make_venue('Test Club') as venue \gset

-- ================================================================ preferences

select tests.authenticate_as(:'b');
select is((select get_my_notification_prefs() ->> 'reminder_time'), '18:00', 'il promemoria serata è alle 18:00 di default');
select is((select get_my_notification_prefs() -> 'reminder_days'), '[0,1,2,3,4,5,6]'::jsonb, 'e vale ogni giorno');
select is((select bool_and((value)::text = 'true') from jsonb_each(get_my_notification_prefs())
            where key in ('reminder', 'day_after', 'friends', 'chat', 'feed', 'creator')), true, 'tutte le categorie sono attive di default');
select throws_ok($$ select set_my_notification_prefs('{"foo": true}') $$, 'P0001', 'INVALID_PREFS', 'chiave sconosciuta rifiutata');
select throws_ok($$ select set_my_notification_prefs('{"chat": "yes"}') $$, 'P0001', 'INVALID_PREFS', 'le categorie devono essere booleane');
select throws_ok($$ select set_my_notification_prefs('{"reminder_days": [7]}') $$, 'P0001', 'INVALID_PREFS', 'giorno fuori da 0-6 rifiutato');
select throws_ok($$ select set_my_notification_prefs('{"reminder_days": [1, 1]}') $$, 'P0001', 'INVALID_PREFS', 'giorni duplicati rifiutati');
select throws_ok($$ select set_my_notification_prefs('{"reminder_days": "lun"}') $$, 'P0001', 'INVALID_PREFS', 'giorni non array rifiutati');
select throws_ok($$ select set_my_notification_prefs('{"reminder_time": "18:10"}') $$, 'P0001', 'INVALID_PREFS', 'ora non a step di 15 minuti rifiutata');
select throws_ok($$ select set_my_notification_prefs('{"reminder_time": "25:00"}') $$, 'P0001', 'INVALID_PREFS', 'ora inesistente rifiutata');
select throws_ok($$ select set_my_notification_prefs('[1]') $$, 'P0001', 'INVALID_PREFS', 'un array al posto dell''oggetto è rifiutato');
select throws_ok($$ select set_my_notification_prefs(null) $$, 'P0001', 'INVALID_PREFS', 'null rifiutato');
select lives_ok($$ select set_my_notification_prefs('{"day_after": false, "reminder_days": [4,5,6], "reminder_time": "19:30"}') $$,
  'preferenze valide salvate');
select is((select get_my_notification_prefs() ->> 'reminder_time'), '19:30', 'l''ora salvata viene restituita');
select is((select get_my_notification_prefs() -> 'reminder_days'), '[4,5,6]'::jsonb, 'anche i giorni');
select is((select get_my_notification_prefs() ->> 'day_after'), 'false', 'la categoria spenta resta spenta');
select is((select get_my_notification_prefs() ->> 'chat'), 'true', 'le chiavi non inviate restano com''erano (merge)');
select set_my_notification_prefs('{"day_after": true, "reminder_days": [0,1,2,3,4,5,6], "reminder_time": "18:00"}');

-- ================================================================ push tokens

select register_push_token('ExponentPushToken[abc-123_X]', 'ios');
reset role;
select is((select user_id from push_tokens where token = 'ExponentPushToken[abc-123_X]'), :'b'::uuid, 'il token è registrato per chi lo invia');
select tests.authenticate_as(:'b');
select throws_ok($$ select register_push_token('not-a-token', 'ios') $$, 'P0001', 'INVALID_TOKEN', 'formato token errato rifiutato');
select throws_ok($$ select register_push_token('ExponentPushToken[x]', 'web') $$, 'P0001', 'INVALID_PLATFORM', 'piattaforma sconosciuta rifiutata');
select lives_ok($$ select register_push_token('ExpoPushToken[nuovo-1]', 'android') $$, 'anche il prefisso ExpoPushToken è valido');

select tests.authenticate_as(:'c');
select register_push_token('ExponentPushToken[abc-123_X]', 'android');
reset role;
select is((select user_id from push_tokens where token = 'ExponentPushToken[abc-123_X]'), :'c'::uuid,
  'stesso telefono, altro account: il token passa al nuovo utente');
select is((select count(*)::int from push_tokens where token = 'ExponentPushToken[abc-123_X]'), 1, 'senza duplicati');
select tests.authenticate_as(:'b');
select is((select count(*)::int from push_tokens where token = 'ExponentPushToken[abc-123_X]'), 0, 'b non vede più il token e non vede mai quelli altrui');
select unregister_push_token('ExponentPushToken[abc-123_X]');
reset role;
select is((select count(*)::int from push_tokens where token = 'ExponentPushToken[abc-123_X]'), 1, 'non si rimuovono i token degli altri');
select tests.authenticate_as(:'c');
select unregister_push_token('ExponentPushToken[abc-123_X]');
reset role;
select is((select count(*)::int from push_tokens where token = 'ExponentPushToken[abc-123_X]'), 0, 'si rimuovono i propri token');
select ok(not exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace,
                      unnest(coalesce(p.proargnames, '{}')) with ordinality x(arg, i)
                where n.nspname = 'public' and p.proargmodes is not null and p.proargmodes[i] in ('o', 't') and arg ~* 'token'),
  'nessuna RPC restituisce token');

-- ================================================================ chat author rule with explicit viewer
-- (prompt 19: the rule now takes the room; a random room has no members, so only the direct cases apply here.
-- The friends-of-friends cases live in 24_chat_friends_of_friends.sql.)

select tests.follow(:'b', :'a');
select tests.follow(:'d', :'a');
select tests.follow(:'f', :'a');
select tests.follow(:'e', :'a', 'pending');
insert into blocks (blocker_id, blocked_id) values (:'a', :'d');
select ok(private.can_see_chat_author_for(:'b', gen_random_uuid(), :'a'), 'chi segue l''autore lo vede');
select ok(private.can_see_chat_author_for(:'a', gen_random_uuid(), :'a'), 'l''autore vede se stesso');
select ok(not private.can_see_chat_author_for(:'c', gen_random_uuid(), :'a'), 'chi non segue non lo vede');
select ok(not private.can_see_chat_author_for(:'e', gen_random_uuid(), :'a'), 'una richiesta pending non sblocca nulla');
select ok(not private.can_see_chat_author_for(:'d', gen_random_uuid(), :'a'), 'il blocco prevale');
select set_config('request.jwt.claims', json_build_object('sub', :'b'::text, 'role', 'authenticated')::text, true);
select ok(private.can_see_chat_author(gen_random_uuid(), :'a'), 'il wrapper con auth.uid() dà lo stesso risultato');
select ok(pg_get_functiondef('private.can_see_chat_author(uuid,uuid)'::regprocedure) like '%can_see_chat_author_for%',
  'la regola vive in un solo posto: can_see_chat_author la richiama');

-- ================================================================ follows triggers

delete from private.notification_queue;
delete from follows;
delete from blocks;
select tests.follow(:'b', :'a', 'pending');
select is((select array_agg(user_id::text || ':' || category || ':' || kind || ':' || group_key)
             from private.notification_queue),
  array[:'a' || ':friends:follow_request:follow_requests'], 'la richiesta di follow avvisa chi la riceve');
select is((select params ->> 'handle' from private.notification_queue), 'volpe.blu', 'con l''handle di chi chiede');
select tests.follow(:'c', :'a', 'pending');
select is((select count(*)::int from private.notification_queue where user_id = :'a'), 2, 'più richieste: due righe, coalescenza al dispatch');
delete from private.notification_queue;
update follows set status = 'accepted' where follower_id = :'b' and followee_id = :'a';
select is((select array_agg(user_id::text || ':' || kind) from private.notification_queue),
  array[:'b' || ':follow_accepted'], 'l''accettazione avvisa chi aveva chiesto');
select is((select params ->> 'handle' from private.notification_queue), 'lince.rosso', 'con l''handle di chi ha accettato');
delete from private.notification_queue;
delete from follows where follower_id = :'c';
select is((select count(*)::int from private.notification_queue), 0, 'nessuna push su rimozione o rifiuto');
update profiles set notification_prefs = jsonb_set(notification_prefs, '{friends}', 'false') where id = :'a';
select tests.follow(:'c', :'a', 'pending');
select is((select count(*)::int from private.notification_queue), 0, 'con la categoria amici spenta non si accoda nulla');
update profiles set notification_prefs = jsonb_set(notification_prefs, '{friends}', 'true') where id = :'a';
delete from follows where follower_id = :'c';
delete from private.notification_queue;

-- ================================================================ chat messages

select tests.follow(:'d', :'a');
select tests.follow(:'f', :'a');
select tests.follow(:'e', :'a', 'pending');
select tests.make_declaration(u, :'venue') from (values (:'a'::uuid), (:'b'::uuid), (:'c'::uuid), (:'d'::uuid), (:'e'::uuid), (:'f'::uuid)) v(u);
select id as room from chat_rooms limit 1 \gset
insert into blocks (blocker_id, blocked_id) values (:'a', :'d');
update profiles set notification_prefs = jsonb_set(notification_prefs, '{chat}', 'false') where id = :'f';
delete from private.notification_queue;

insert into chat_messages (room_id, user_id, kind, text)
select :'room', :'a', 'text', 'segreto ' || i from generate_series(1, 5) i;
select is((select array_agg(distinct user_id::text) from private.notification_queue),
  array[:'b'], 'solo chi può vedere l''autore riceve: non l''autore, non chi non segue, non il pending, non il bloccato, non chi ha spento la chat');
select is((select count(*)::int from private.notification_queue where category = 'chat' and kind = 'chat_message' and group_key = 'room:' || :'room'),
  5, 'una riga per messaggio, stessa chiave stanza');
select is((select count(*)::int from private.notification_queue where params::text like '%segreto%'), 0, 'la coda non contiene mai il testo dei messaggi');
select is((select params ->> 'venue_name' from private.notification_queue limit 1), 'Test Club', 'ma il nome del locale sì');

-- dispatch: without Vault secrets nothing leaves and nothing is lost
delete from net._calls;
delete from vault.decrypted_secrets;
select is(private.dispatch_notifications(), 0, 'senza segreti nel Vault non parte nulla');
select is((select count(*)::int from private.notification_queue where sent_at is null), 5, 'e la coda resta in attesa');
insert into vault.decrypted_secrets (name, decrypted_secret) values
  ('send_push_url', 'https://example.test/functions/v1/send-push'), ('send_push_key', 'chiave-push');
select is(private.dispatch_notifications(), 1, 'con i segreti, 5 messaggi diventano 1 messaggio push');
select is((select count(*)::int from net._calls), 1, 'una sola chiamata a pg_net');
select is((select headers ->> 'x-push-key' from net._calls), 'chiave-push', 'autenticata con x-push-key');
select is((select jsonb_array_length(body -> 'messages') from net._calls), 1, 'un messaggio nel batch');
select is((select body -> 'messages' -> 0 -> 'user_ids' from net._calls), jsonb_build_array(:'b'::text), 'destinato solo a b');
select is((select body -> 'messages' -> 0 ->> 'body' from net._calls), '5 nuovi messaggi da @lince.rosso', 'testo coalescito (un solo mittente)');
select is((select body -> 'messages' -> 0 -> 'data' ->> 'url' from net._calls), 'rightplace://night/' || :'room' || '/chat', 'deep link alla chat');
select is((select body -> 'messages' -> 0 ->> 'channel_id' from net._calls), 'chat', 'canale chat');
select ok((select body::text not like '%segreto%' from net._calls), 'il payload non contiene mai il testo del messaggio');
select is((select count(*)::int from private.notification_queue where sent_at is null), 0, 'righe marcate come inviate');
select is((select count(*)::int from private.push_log where user_id = :'b' and group_key = 'room:' || :'room'), 1, 'e registrate per il rate limit');

-- rate limit: 1 push every 10 minutes per room
insert into chat_messages (room_id, user_id, kind, text) values (:'room', :'a', 'text', 'ancora');
select is(private.dispatch_notifications(), 0, 'entro 10 minuti non parte una seconda push per la stessa stanza');
select is((select count(*)::int from net._calls), 1, 'nessuna nuova chiamata');
select is((select count(*)::int from private.notification_queue where sent_at is null), 1, 'il messaggio resta in coda');
update private.push_log set sent_at = now() - interval '11 minutes';
select is(private.dispatch_notifications(), 1, 'passati 10 minuti la coda confluisce in una nuova push');
select is((select count(*)::int from net._calls), 2, 'seconda chiamata');
select is((select count(*)::int from net._calls where body -> 'messages' -> 0 ->> 'body' = 'Nuovo messaggio nella chat di Test Club'), 1,
  'un solo messaggio: testo singolare con il nome del locale');

-- preferences are checked again at send time
insert into chat_messages (room_id, user_id, kind, text) values (:'room', :'a', 'text', 'tardi');
update profiles set notification_prefs = jsonb_set(notification_prefs, '{chat}', 'false') where id = :'b';
update private.push_log set sent_at = now() - interval '11 minutes';
select count(*)::int as before_rows from private.notification_queue where user_id = :'b' \gset
select is(private.dispatch_notifications(), 0, 'chat disattivata nel frattempo: niente push');
select is((select count(*)::int from net._calls), 2, 'e nessuna chiamata a net.http_post');
select is((select count(*)::int from private.notification_queue where user_id = :'b'), :before_rows - 1,
  'le righe in coda di una categoria spenta vengono cancellate, non marcate come inviate');
update profiles set notification_prefs = jsonb_set(notification_prefs, '{chat}', 'true') where id = :'b';

-- locale
update profiles set locale = 'en' where id = :'b';
update private.push_log set sent_at = now() - interval '11 minutes';
insert into chat_messages (room_id, user_id, kind, text) values (:'room', :'a', 'text', 'late');
select private.dispatch_notifications();
select is((select count(*)::int from net._calls where body -> 'messages' -> 0 ->> 'body' = 'New message in the Test Club chat'), 1,
  'il testo segue profiles.locale (en)');
update profiles set locale = 'it' where id = :'b';

-- ================================================================ templates

select is((select body from private.render_notification('it', 'follow_request', 1, '{"handle":"volpe.viola"}')), '@volpe.viola vuole seguirti', 'IT richiesta singola');
select is((select body from private.render_notification('it', 'follow_request', 3, '{"handle":"volpe.viola"}')), '3 nuove richieste di follow', 'IT richieste coalescite');
select is((select body from private.render_notification('en', 'follow_request', 3, '{"handle":"volpe.viola"}')), '3 new follow requests', 'EN richieste coalescite');
select is((select url from private.render_notification('it', 'follow_request', 1, '{}')), 'rightplace://friends/requests', 'deep link richieste');
select is((select body from private.render_notification('it', 'follow_accepted', 1, '{"handle":"orso.grigio"}')), '@orso.grigio ha accettato la tua richiesta', 'IT accettata');
select is((select url from private.render_notification('en', 'follow_accepted', 1, '{"handle":"orso.grigio"}')), 'rightplace://u/orso.grigio', 'deep link profilo');
select is((select body from private.render_notification('it', 'feed_digest', 1, '{"count":3}')), '3 amici hanno postato le foto di ieri', 'IT digest');
select is((select body from private.render_notification('en', 'feed_digest', 1, '{"count":3}')), '3 friends posted photos from last night', 'EN digest');
select is((select url from private.render_notification('en', 'feed_digest', 1, '{"count":3}')), 'rightplace://feed', 'deep link feed');
select is((select body from private.render_notification('it', 'attendance_band', 1, '{"event_name":"Notte","band":"3–10"}')), 'Notte: adesioni 3–10', 'IT adesioni');
select is((select body from private.render_notification('en', 'event_cancelled', 1, '{"event_name":"Night"}')), 'Night has been cancelled', 'EN annullata');
select is((select body from private.render_notification('it', 'event_cancelled', 1, '{"event_name":"Notte"}')), 'Notte è stata annullata', 'IT annullata');
select is((select count(*)::int from private.render_notification('it', 'sconosciuto', 1, '{}')), 0, 'tipo sconosciuto: nessun testo');

-- ================================================================ event attendance thresholds

select tests.create_user('creator.viola') as cr \gset
select tests.make_event(:'cr', :'venue', 'Notte Techno') as ev \gset
delete from private.notification_queue;
select tests.make_event_crowd(:'ev', 2);
select is((select count(*)::int from private.notification_queue where kind = 'attendance_band'), 0, '2 adesioni: nessuna notifica (mai per singola persona)');
select tests.make_event_crowd(:'ev', 1);
select is((select array_agg(params ->> 'band') from private.notification_queue where kind = 'attendance_band' and user_id = :'cr'),
  array['3–10'], 'alla 3a adesione il creator riceve la fascia 3–10');
select is((select category from private.notification_queue where kind = 'attendance_band'), 'creator', 'categoria creator');
select tests.make_event_crowd(:'ev', 1);
select is((select count(*)::int from private.notification_queue where kind = 'attendance_band'), 1, '4 adesioni: nessuna nuova notifica');
select tests.make_event_crowd(:'ev', 4, 'maybe');
select is((select count(*)::int from private.notification_queue where kind = 'attendance_band'), 1, 'i "forse" non contano');
select tests.make_event_crowd(:'ev', 6);
select is((select array_agg(params ->> 'band' order by id) from private.notification_queue where kind = 'attendance_band'),
  array['3–10', '10–20'], 'a 10 adesioni scatta la fascia 10–20');
select ok(not exists (select 1 from private.notification_queue where params::text ~ '[0-9]+ ?(persone|people)'), 'mai il numero esatto');
select is((select count(*)::int from private.notification_queue where kind = 'attendance_band' and user_id <> :'cr'), 0, 'solo al creator');

-- ================================================================ event cancelled

select tests.make_event(:'cr', :'venue', 'Notte Annullata') as ev2 \gset
insert into declarations (user_id, event_id, intent) values (:'a', :'ev2', 'going'), (:'b', :'ev2', 'maybe'), (:'cr', :'ev2', 'going');
delete from private.notification_queue;
update events set cancelled_at = now() where id = :'ev2';
select is((select array_agg(user_id::text order by user_id) from private.notification_queue where kind = 'event_cancelled'),
  (select array_agg(u::text order by u) from (values (:'a'::uuid), (:'b'::uuid)) v(u)), 'chi aveva dichiarato viene avvisato, non il creator');
select is((select category from private.notification_queue where kind = 'event_cancelled' limit 1), 'chat', 'nella categoria "Chat e serate"');
select is((select params ->> 'event_name' from private.notification_queue where kind = 'event_cancelled' limit 1), 'Notte Annullata', 'con il nome della serata');
delete from private.notification_queue;
update events set name = 'Rinominata' where id = :'ev2';
select is((select count(*)::int from private.notification_queue), 0, 'modifiche diverse dall''annullamento non notificano');

-- ================================================================ feed digest

delete from private.notification_queue;
delete from follows;
delete from blocks;
select tests.create_user('p.uno') as p1 \gset
select tests.create_user('p.due') as p2 \gset
select tests.create_user('p.tre') as p3 \gset
select tests.create_user('p.quattro') as p4 \gset
select tests.create_user('u.viewer') as u \gset
select tests.create_user('u.canary', 25, 'female', 'las-palmas') as ucan \gset
select tests.create_user('u.blocker') as ublock \gset
select tests.create_user('u.quiet') as uquiet \gset
select ((date_trunc('day', now() at time zone 'Europe/Rome') + interval '12 hours') at time zone 'Europe/Rome') as noon \gset
select tests.follow(x, y) from (values (:'u'::uuid, :'p1'::uuid), (:'u', :'p2'), (:'u', :'p3'), (:'ucan', :'p1'),
  (:'ublock', :'p1'), (:'uquiet', :'p1')) v(x, y);
insert into blocks (blocker_id, blocked_id) values (:'ublock', :'p1');
update profiles set notification_prefs = jsonb_set(notification_prefs, '{feed}', 'false') where id = :'uquiet';
select tests.make_post(:'p1', :'venue', :'noon'::timestamptz - interval '3 hours', :'noon'::timestamptz + interval '7 days');
select tests.make_post(:'p2', :'venue', :'noon'::timestamptz - interval '5 hours', :'noon'::timestamptz + interval '7 days');
select tests.make_post(:'p3', :'venue', :'noon'::timestamptz - interval '30 hours', :'noon'::timestamptz + interval '7 days');
select tests.make_post(:'p4', :'venue', :'noon'::timestamptz - interval '3 hours', :'noon'::timestamptz + interval '7 days');
delete from private.notification_queue;
select private.queue_feed_digests(:'noon'::timestamptz + interval '2 hours');
select is((select count(*)::int from private.notification_queue), 0, 'alle 14 di Roma (13 a Las Palmas) non si accoda nessun digest');
select private.queue_feed_digests(:'noon'::timestamptz);
select is((select array_agg(user_id::text) from private.notification_queue), array[:'u'], 'alle 12 locali solo chi ha seguiti con post recenti (non Las Palmas: là sono le 11, non bloccati, non chi ha spento il feed)');
select is((select (params ->> 'count')::int from private.notification_queue), 2, 'conta i seguiti con post nuovi nelle ultime 24 ore (non il post vecchio, non chi non seguo)');
select is((select category || ':' || kind from private.notification_queue), 'feed:feed_digest', 'categoria feed');
select private.queue_feed_digests(:'noon'::timestamptz);
select is((select count(*)::int from private.notification_queue), 1, 'un solo digest al giorno anche se il job gira di nuovo');
select private.queue_feed_digests(:'noon'::timestamptz - interval '1 hour');
select is((select count(*)::int from private.notification_queue), 1, 'e fuori dalle 12 locali non fa nulla');

-- ================================================================ activity (in-app, no push permission needed)

delete from follows;
delete from blocks;
select tests.create_user('act.owner') as o \gset
select tests.create_user('act.liker') as liker \gset
select tests.create_user('act.commenter') as commenter \gset
select tests.create_user('act.pending') as pending \gset
select tests.create_user('act.accepter') as accepter \gset
select tests.create_user('act.blocked') as blocked \gset
select tests.create_user('act.gone') as gone \gset
select tests.follow(:'o', :'accepter');
select tests.follow(:'pending', :'o', 'pending');
select tests.make_post(:'o', :'venue', now() - interval '1 hour', now() + interval '7 days') as post \gset
select tests.make_post(:'o', :'venue', now() - interval '10 days', now() - interval '3 days') as old_post \gset
insert into post_likes (post_id, user_id) values (:'post', :'liker'), (:'post', :'o'), (:'post', :'blocked'), (:'post', :'gone'), (:'old_post', :'liker');
insert into post_comments (post_id, user_id, text) values (:'post', :'commenter', 'commento privato'), (:'post', :'o', 'mio commento');
insert into blocks (blocker_id, blocked_id) values (:'o', :'blocked');
update profiles set deleted_at = now() where id = :'gone';
select tests.authenticate_as(:'o');
select is((select array_agg(kind || ':' || actor_handle order by kind, actor_handle) from get_my_activity()),
  array['comment:act.commenter', 'follow_accepted:act.accepter', 'follow_request:act.pending', 'like:act.liker'],
  'novità: like e commenti degli altri sui miei post, richieste e accettazioni; non le mie azioni, bloccati, cancellati, post scaduti');
select ok(not exists (select 1 from pg_proc p, unnest(p.proargnames) with ordinality x(arg, i)
                where p.proname = 'get_my_activity' and p.proargmodes[i] in ('o', 't') and arg in ('text', 'comment_text', 'body')),
  'get_my_activity non restituisce mai il testo dei commenti');
select is((select count(*)::int from get_my_activity(now() + interval '1 hour')), 0, 'p_since filtra le novità più vecchie');
select is((select post_id from get_my_activity() where kind = 'like'), :'post'::uuid, 'like e commenti portano il post');
select is((select post_id from get_my_activity() where kind = 'follow_request'), null, 'le richieste non hanno post');
select is((select count(*)::int from get_my_activity()), 4, 'ordinate e limitate');
select tests.authenticate_as(:'liker');
select is((select count(*)::int from get_my_activity()), 0, 'chi non ha post né richieste non vede nulla degli altri');

-- ================================================================ cleanup, jobs, privileges

reset role;
delete from private.notification_queue;
delete from private.push_log;
insert into private.notification_queue (user_id, category, kind, group_key, params, created_at, sent_at)
values (:'a', 'friends', 'follow_request', 'x', '{}', now() - interval '4 days', now() - interval '3 days'),
       (:'a', 'friends', 'follow_request', 'y', '{}', now() - interval '4 days', null),
       (:'a', 'friends', 'follow_request', 'z', '{}', now() - interval '1 minute', now() - interval '1 hour');
insert into private.push_log (user_id, group_key, sent_at) values (:'a', 'old', now() - interval '8 days'), (:'a', 'new', now() - interval '1 day');
select private.dispatch_notifications();
select is((select array_agg(group_key order by group_key) from private.notification_queue), array['z'],
  'righe inviate da oltre 2 giorni e in coda da oltre 2 giorni vengono cancellate');
select is((select array_agg(group_key) from private.push_log), array['new'], 'push_log oltre 7 giorni cancellato');

select ok((select schedule = '* * * * *' and command like '%dispatch_notifications%' from cron.job where jobname = 'dispatch-notifications'),
  'il dispatcher gira ogni minuto');
select ok((select schedule = '5 * * * *' and command like '%queue_feed_digests%' from cron.job where jobname = 'queue-feed-digests'),
  'il digest del feed viene valutato ogni ora');

select ok(not has_function_privilege('anon', 'get_my_notification_prefs()', 'execute')
      and not has_function_privilege('anon', 'set_my_notification_prefs(jsonb)', 'execute')
      and not has_function_privilege('anon', 'register_push_token(text,text)', 'execute')
      and not has_function_privilege('anon', 'unregister_push_token(text)', 'execute')
      and not has_function_privilege('anon', 'get_my_activity(timestamptz)', 'execute'),
  'anon non esegue nulla');
select ok(not has_function_privilege('authenticated', 'private.dispatch_notifications(timestamptz)', 'execute')
      and not has_function_privilege('authenticated', 'private.queue_feed_digests(timestamptz)', 'execute')
      and not has_function_privilege('authenticated', 'private.invoke_send_push(jsonb)', 'execute')
      and not has_function_privilege('authenticated', 'private.render_notification(text,text,int,jsonb)', 'execute')
      and not has_function_privilege('authenticated', 'private.can_see_chat_author_for(uuid,uuid,uuid)', 'execute'),
  'dispatcher, digest, invio e regole private non sono eseguibili dai client');
select tests.authenticate_as(:'b');
select throws_ok($$ select * from private.notification_queue $$, '42501', null, 'la coda non è leggibile dai client');
select throws_ok($$ select * from private.push_log $$, '42501', null, 'né il registro degli invii');
select throws_ok($$ update public.profiles set notification_prefs = '{}' $$, '42501', null, 'le preferenze si scrivono solo via RPC');
reset role;

select * from finish();
rollback;
