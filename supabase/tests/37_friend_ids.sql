begin;
\ir helpers/setup.psql
select plan(16);

-- Prompt 22, blocco 2: dove le RPC elencano già gli amici per handle, ora restituiscono anche il loro id (serve solo
-- a chiedere la foto con avatar-urls, che decide la visibilità lato server). Mai l'id di chi non è un amico accettato.
select tests.create_user('lince.rosso') as me \gset
select tests.create_user('volpe.viola') as fa \gset
select tests.create_user('gatto.blu') as fb \gset
select tests.create_user('panda.rosa') as pend \gset
select tests.create_user('orso.verde') as stranger \gset
select tests.make_venue('Locale amici') as v \gset
select tests.make_venue('Locale sconosciuto') as v_other \gset
select tests.follow(:'me', :'fa');
select tests.follow(:'me', :'fb');
select tests.follow(:'me', :'pend', 'pending');
select tests.make_declaration(:'fa', :'v', 'going');
select tests.make_declaration(:'fb', :'v', 'maybe');
select tests.make_declaration(:'pend', :'v', 'going');
select tests.make_declaration(:'stranger', :'v_other', 'going');

select tests.authenticate_as(:'me');

-- get_city_map: friends_going_ids è allineato a friends_going
create temp table friends_map as select * from get_city_map('milano', 'friends');
select is((select count(*)::int from friends_map), 1, 'mappa amici: stessi locali di prima (solo quelli dei miei seguiti)');
select is((select friends_going from friends_map where venue_id = :'v'), array['gatto.blu', 'volpe.viola'],
  'mappa amici: gli handle sono quelli di prima, ordinati');
select is((select friends_going_ids from friends_map where venue_id = :'v'), array[:'fb'::uuid, :'fa'::uuid],
  'mappa amici: gli id corrispondono agli handle, nello stesso ordine');
select is((select friends_going_ids from friends_map where venue_id = :'v')
  @> array[:'pend'::uuid, :'stranger'::uuid], false, 'mappa amici: nessun id di pending né di sconosciuti');
select is((select array_length(friends_going_ids, 1) from friends_map where venue_id = :'v'),
  (select friends_count from friends_map where venue_id = :'v'), 'mappa amici: tanti id quanti amici');
select is((select count(*)::int from get_city_map('milano', 'general') where friends_going_ids is not null), 0,
  'mappa generale: nessun id di amici');

-- get_venue_stats: friends porta user_id
select is((select jsonb_array_length(friends) from get_venue_stats(:'v', 'all')), 2,
  'dettaglio locale: stessi amici di prima');
select is((select array_agg(e ->> 'user_id' order by e ->> 'handle') from get_venue_stats(:'v', 'all'), jsonb_array_elements(friends) e),
  array[:'fb'::text, :'fa'::text], 'dettaglio locale: user_id coerente con l''handle');
select is((select count(*)::int from get_venue_stats(:'v_other', 'all'), jsonb_array_elements(friends)), 0,
  'dettaglio locale: nessun id per i locali di sconosciuti');

-- get_event_detail: stesso campo
reset role;
select tests.create_user('creator.evento') as cr \gset
insert into public.events (venue_id, creator_id, name, starts_at, ends_at)
  values (:'v', :'cr', 'Serata test', now() + interval '2 hours', now() + interval '6 hours') returning id as ev \gset
insert into public.declarations (user_id, event_id, intent, expires_at)
  values (:'fa', :'ev', 'going', now() + interval '1 day'), (:'stranger', :'ev', 'going', now() + interval '1 day');
select tests.authenticate_as(:'me');
select is((select jsonb_array_length(friends) from get_event_detail(:'ev')), 1, 'dettaglio evento: stessi amici di prima');
select is((select friends -> 0 ->> 'user_id' from get_event_detail(:'ev')), :'fa'::text, 'dettaglio evento: user_id dell''amico');

-- get_my_activity: actor_id
reset role;
select tests.make_post(:'me', :'v', now() - interval '1 hour', now() + interval '7 days') as post \gset
insert into post_likes (post_id, user_id) values (:'post', :'fa');
select tests.authenticate_as(:'me');
select is((select array_agg(kind order by kind) from get_my_activity()), array['follow_accepted', 'follow_accepted', 'like'],
  'novità: stesse righe di prima');
select is((select actor_id from get_my_activity() where kind = 'like'), :'fa'::uuid, 'novità: actor_id del like');
select is((select array_agg(actor_id order by actor_handle) from get_my_activity() where kind = 'follow_accepted'),
  array[:'fb'::uuid, :'fa'::uuid], 'novità: actor_id coerente con l''handle di chi ha accettato');
reset role;

select ok(not has_function_privilege('anon', 'public.get_city_map(text, text)', 'execute')
      and not has_function_privilege('anon', 'get_my_activity(timestamptz)', 'execute')
      and not has_function_privilege('anon', 'get_venue_stats(uuid, text)', 'execute')
      and not has_function_privilege('anon', 'get_event_detail(uuid)', 'execute'), 'anon non esegue nessuna delle quattro RPC');
select is((select count(*)::int from pg_proc p join pg_namespace n on n.oid = p.pronamespace
            where n.nspname = 'public' and p.proname = 'get_city_map'), 1, 'una sola firma di get_city_map');

select * from finish();
rollback;
