begin;
\ir helpers/setup.psql
select plan(49);

select tests.create_user('lince.rosso') as a \gset
select tests.create_user('volpe.viola') as b \gset
select tests.create_user('gufo.blu') as adm \gset
select tests.create_user('orso.nero') as sup \gset
update public.profiles set is_admin = true where id = :'adm';
update public.profiles set is_support = true where id = :'sup';

-- is_admin non è dei client ---------------------------------------------------------------------------------------
select tests.authenticate_as(:'a');
select throws_ok($$ update public.profiles set is_admin = true where id = auth.uid() $$, '42501', null,
  'un utente non può rendersi admin');
select is((select is_admin from public.profiles where id = :'a'), false, 'il proprio profilo espone is_admin (falso)');
select is((select count(*)::int from public.profiles where id = :'adm'), 0, 'gli altri non leggono il profilo di un admin');
reset role;
select is((select count(*)::int from information_schema.columns where table_schema = 'public'
            and table_name = 'public_profiles' and column_name = 'is_admin'), 0,
  'is_admin non è nella vista pubblica dei profili');

-- tabella inaccessibile ai client ----------------------------------------------------------------------------------
select ok((select relrowsecurity from pg_class where oid = 'public.usage_events'::regclass), 'RLS attiva su usage_events');
select ok(not has_table_privilege('authenticated', 'public.usage_events', 'select')
  and not has_table_privilege('authenticated', 'public.usage_events', 'insert')
  and not has_table_privilege('authenticated', 'public.usage_events', 'update')
  and not has_table_privilege('authenticated', 'public.usage_events', 'delete')
  and not has_table_privilege('anon', 'public.usage_events', 'select'),
  'nessun privilegio sulla tabella per authenticated e anon');
select tests.authenticate_as(:'a');
select throws_ok($$ select * from public.usage_events $$, '42501', null, 'authenticated non legge la tabella');
select throws_ok($$ insert into public.usage_events (user_id, kind) values (auth.uid(), 'login') $$, '42501', null,
  'authenticated non scrive la tabella');
reset role;

-- permessi sulle RPC -----------------------------------------------------------------------------------------------
select ok(not has_function_privilege('anon', 'public.log_login(text, text)', 'execute')
  and not has_function_privilege('anon', 'public.start_usage_session(text, text)', 'execute')
  and not has_function_privilege('anon', 'public.touch_usage_session(bigint)', 'execute')
  and not has_function_privilege('anon', 'public.end_usage_session(bigint)', 'execute')
  and not has_function_privilege('anon', 'public.get_usage_overview(int, text)', 'execute')
  and not has_function_privilege('anon', 'public.get_user_usage(uuid, timestamptz, int)', 'execute'),
  'anon non esegue nessuna RPC di utilizzo');
select ok(not has_function_privilege('authenticated', 'private.purge_usage_events()', 'execute')
  and not has_function_privilege('authenticated', 'private.require_admin()', 'execute'),
  'job e guardia non sono eseguibili dai client');

-- log_login --------------------------------------------------------------------------------------------------------
select tests.authenticate_as(:'a');
select lives_ok($$ select log_login('ios', '1.2.3') $$, 'log_login registra un accesso');
select throws_ok($$ select log_login('symbian', '1') $$, 'P0001', 'INVALID_ARGUMENT', 'piattaforma non valida rifiutata');
reset role;
select is((select count(*)::int from public.usage_events where user_id = :'a' and kind = 'login' and platform = 'ios'
            and app_version = '1.2.3' and ended_at = started_at and last_seen_at = started_at), 1,
  'riga login con start = last_seen = ended');
select is((select count(*)::int from public.usage_events where user_id <> :'a'), 0, 'scrive solo per sé');
select tests.authenticate_as(:'a');
select log_login('ios', repeat('x', 80)) from generate_series(1, 30);
reset role;
select is((select count(*)::int from public.usage_events where user_id = :'a' and kind = 'login'), 20,
  'massimo 20 accessi al giorno, oltre: ignorati in silenzio');
select is((select max(char_length(app_version))::int from public.usage_events where user_id = :'a'), 32,
  'la versione è troncata a 32 caratteri');

-- sessioni ---------------------------------------------------------------------------------------------------------
select tests.authenticate_as(:'a');
select start_usage_session('android', '2.0.0') as s1 \gset
select ok(:s1 is not null, 'start_usage_session restituisce un id');
reset role;
select is((select kind || '/' || coalesce(ended_at::text, 'open') from public.usage_events where id = :s1), 'session/open',
  'sessione aperta');
update public.usage_events set last_seen_at = now() - interval '5 minutes', started_at = now() - interval '9 minutes'
 where id = :s1;
select tests.authenticate_as(:'a');
select start_usage_session('android', '2.0.0') as s2 \gset
reset role;
select is((select ended_at from public.usage_events where id = :s1), (select last_seen_at from public.usage_events where id = :s1),
  'la nuova sessione chiude quella rimasta aperta con ended_at = last_seen_at');
select is((select ended_at from public.usage_events where id = :s2), null, 'la nuova sessione è aperta');

-- touch: throttle e proprietà ---------------------------------------------------------------------------------------
update public.usage_events set last_seen_at = now() - interval '2 minutes' where id = :s2;
select tests.authenticate_as(:'a');
select touch_usage_session(:s2);
reset role;
select is((select last_seen_at from public.usage_events where id = :s2), now(), 'touch aggiorna last_seen_at');
update public.usage_events set last_seen_at = now() - interval '10 seconds' where id = :s2;
select tests.authenticate_as(:'a');
select touch_usage_session(:s2);
reset role;
select is((select last_seen_at from public.usage_events where id = :s2), now() - interval '10 seconds',
  'touch più frequente di 30 s: nessun effetto');
update public.usage_events set last_seen_at = now() - interval '2 minutes' where id = :s2;
select tests.authenticate_as(:'b');
select touch_usage_session(:s2);
select end_usage_session(:s2);
reset role;
select is((select last_seen_at from public.usage_events where id = :s2), now() - interval '2 minutes',
  'B non tocca la sessione di A');
select is((select ended_at from public.usage_events where id = :s2), null, 'B non chiude la sessione di A');
select tests.authenticate_as(:'a');
select end_usage_session(:s2);
reset role;
select ok((select ended_at is not null from public.usage_events where id = :s2), 'A chiude la propria sessione');
update public.usage_events set last_seen_at = now() - interval '2 minutes' where id = :s2;
select tests.authenticate_as(:'a');
select touch_usage_session(:s2);
reset role;
select is((select last_seen_at from public.usage_events where id = :s2), now() - interval '2 minutes',
  'una sessione chiusa non si tocca più');

-- limite sessioni --------------------------------------------------------------------------------------------------
insert into public.usage_events (user_id, kind, platform, ended_at)
  select :'b', 'session', 'ios', now() from generate_series(1, 200);
select tests.authenticate_as(:'b');
select is(start_usage_session('ios', '1'), null, 'oltre 200 sessioni al giorno: null');
reset role;
select is((select count(*)::int from public.usage_events where user_id = :'b'), 200, 'nessuna riga in più oltre il limite');
delete from public.usage_events where user_id = :'b';

-- RPC admin: guardia -----------------------------------------------------------------------------------------------
select tests.authenticate_as(:'a');
select throws_ok($$ select * from get_usage_overview(30, null) $$, 'P0001', 'NOT_ADMIN', 'overview: utente normale rifiutato');
select throws_ok(format($$ select * from get_user_usage(%L, null, 50) $$, :'a'), 'P0001', 'NOT_ADMIN', 'dettaglio: utente normale rifiutato');
reset role;
select tests.authenticate_as(:'sup');
select throws_ok($$ select * from get_usage_overview(30, null) $$, 'P0001', 'NOT_ADMIN', 'is_support senza is_admin rifiutato');
reset role;

-- RPC admin: dati --------------------------------------------------------------------------------------------------
delete from public.usage_events;
insert into public.usage_events (user_id, kind, started_at, last_seen_at, ended_at, platform, app_version) values
  (:'a', 'login',   now() - interval '3 days',  now() - interval '3 days',  now() - interval '3 days',  'ios', '1.0.0'),
  (:'a', 'login',   now() - interval '1 day',   now() - interval '1 day',   now() - interval '1 day',   'android', '1.1.0'),
  (:'a', 'session', now() - interval '3 days',  now() - interval '3 days' + interval '30 minutes', now() - interval '3 days' + interval '30 minutes', 'ios', '1.0.0'),
  (:'a', 'session', now() - interval '1 day',   now() - interval '1 day' + interval '10 minutes', now() - interval '1 day' + interval '15 minutes', 'android', '1.1.0'),
  (:'b', 'session', now() - interval '40 days', now() - interval '40 days' + interval '10 minutes', null, 'ios', '0.9.0');
select tests.authenticate_as(:'adm');
select is((select count(*)::int from get_usage_overview(30, null)), 1, 'overview 30 giorni: solo chi ha eventi nel periodo');
select is((select logins || '/' || sessions || '/' || total_minutes from get_usage_overview(30, null)), '2/2/45',
  'accessi, sessioni e minuti (ended_at se chiusa, altrimenti last_seen_at)');
select is((select last_platform || '/' || last_app_version from get_usage_overview(30, null)), 'android/1.1.0',
  'ultima piattaforma e versione');
select is((select handle from get_usage_overview(30, null)), 'lince.rosso', 'handle, non email');
select is((select array_agg(handle order by last_seen_at desc) from get_usage_overview(90, null)),
  array['lince.rosso', 'volpe.viola'], 'overview 90 giorni: ordinata per ultimo accesso');
select is((select total_minutes from get_usage_overview(90, null) where handle = 'volpe.viola'), 10,
  'sessione orfana: minuti fino a last_seen_at');
select is((select array_agg(handle) from get_usage_overview(90, '@VOLPE')), array['volpe.viola'], 'filtro per handle (anche con @, senza maiuscole)');
select is((select count(*)::int from get_usage_overview(90, 'zzz')), 0, 'filtro senza risultati');
select is((select array_agg(kind || ':' || minutes order by started_at desc, kind) from get_user_usage(:'a', null, 50)),
  array['login:0', 'session:15', 'login:0', 'session:30'], 'dettaglio: più recenti prima, con minuti');
select is((select count(*)::int from get_user_usage(:'a', now() - interval '2 days', 50)), 2, 'dettaglio: paginazione con p_before');
select is((select count(*)::int from get_user_usage(:'a', null, 1)), 1, 'dettaglio: p_limit');
reset role;

-- job di pulizia ---------------------------------------------------------------------------------------------------
delete from public.usage_events;
insert into public.usage_events (user_id, kind, started_at, last_seen_at, ended_at) values
  (:'a', 'login',   now() - interval '91 days', now() - interval '91 days', now() - interval '91 days'),
  (:'a', 'login',   now() - interval '89 days', now() - interval '89 days', now() - interval '89 days'),
  (:'a', 'session', now() - interval '2 hours', now() - interval '1 hour', null),
  (:'a', 'session', now() - interval '5 minutes', now() - interval '1 minute', null);
select private.purge_usage_events();
select is((select count(*)::int from public.usage_events where started_at < now() - interval '90 days'), 0, 'oltre 90 giorni: cancellati');
select is((select count(*)::int from public.usage_events), 3, 'entro 90 giorni: conservati');
select is((select ended_at from public.usage_events where kind = 'session' and last_seen_at = now() - interval '1 hour'),
  now() - interval '1 hour', 'sessione orfana (> 10 minuti): chiusa con ended_at = last_seen_at');
select is((select count(*)::int from public.usage_events where kind = 'session' and ended_at is null), 1,
  'sessione recente: ancora aperta');
select ok(exists (select 1 from cron.job where jobname = 'purge-usage-events'), 'il job è pianificato');

-- cancellazione account ----------------------------------------------------------------------------------------------
select tests.authenticate_as(:'a');
select delete_my_account();
reset role;
select is((select count(*)::int from public.usage_events where user_id = :'a'), 0, 'delete_my_account cancella subito gli eventi');
select tests.authenticate_as(:'a');
select throws_ok($$ select log_login('ios', '1') $$, 'P0001', 'NOT_AUTHENTICATED', 'un account in cancellazione non registra più nulla');
reset role;

select * from finish();
rollback;
