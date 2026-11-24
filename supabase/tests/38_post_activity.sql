begin;
\ir helpers/setup.psql
select plan(21);

-- Novità del cuore -> post: get_my_activity porta comment_id, get_post legge UN post visibile, get_post_likers lo
-- dice solo all'autore (principi 1, 5, 6).
select tests.create_user('lince.rosso') as me \gset
select tests.create_user('volpe.viola') as fa \gset
select tests.create_user('gatto.blu') as fb \gset
select tests.create_user('panda.rosa') as pend \gset
select tests.create_user('orso.verde') as stranger \gset
select tests.create_user('lupo.nero') as gone \gset
select tests.make_venue('Locale post') as v \gset
select tests.follow(:'fa', :'me');
select tests.follow(:'fb', :'me');
select tests.follow(:'gone', :'me');
select tests.follow(:'pend', :'me', 'pending');
select tests.follow(:'me', :'fa');
select tests.make_post(:'me', :'v', now() - interval '1 hour', now() + interval '7 days') as mine \gset
select tests.make_post(:'fa', :'v', now() - interval '1 hour', now() + interval '7 days') as theirs \gset
select tests.make_post(:'fa', :'v', now() - interval '9 days', now() - interval '2 days') as old \gset
select tests.make_post(:'stranger', :'v', now() - interval '1 hour', now() + interval '7 days') as hidden \gset
insert into post_likes (post_id, user_id, created_at) values
  (:'mine', :'fa', now() - interval '3 hours'), (:'mine', :'fb', now() - interval '2 hours'),
  (:'mine', :'gone', now() - interval '1 hour'), (:'theirs', :'me', now());
insert into post_comments (post_id, user_id, text) values (:'mine', :'fa', 'bella serata') returning id as cmt \gset
update profiles set deleted_at = now() where id = :'gone';

select tests.authenticate_as(:'me');

-- get_my_activity: comment_id solo sui commenti
select is((select comment_id from get_my_activity() where kind = 'comment'), :'cmt'::uuid, 'novità: il commento porta il suo comment_id');
select is((select count(*)::int from get_my_activity() where kind <> 'comment' and comment_id is not null), 0,
  'novità: comment_id è null per like e richieste');
select is((select array_agg(kind order by kind) from get_my_activity() where kind in ('like', 'comment')),
  array['comment', 'like', 'like'], 'novità: stesse righe di prima (i like dell''account cancellato restano esclusi)');
select is((select count(*)::int from get_my_activity() where actor_id is null), 0, 'novità: actor_id sempre presente');

-- get_post: stesse colonne di get_feed, un solo post visibile
select is((select count(*)::int from get_post(:'mine')), 1, 'get_post: il mio post');
select is((select count(*)::int from get_post(:'theirs')), 1, 'get_post: il post di chi seguo (follow accettato)');
select is((select post_id from get_post(:'theirs')), :'theirs'::uuid, 'get_post: restituisce l''id richiesto');
select is((select (like_count, comment_count, liked_by_me, is_mine)::text from get_post(:'mine')), '(3,1,f,t)',
  'get_post: contatori e flag come get_feed');
select is((select to_jsonb(g) - 'post_id' from get_post(:'mine') g),
  (select to_jsonb(f) - 'post_id' from get_feed() f where f.post_id = :'mine'), 'get_post: stesse colonne e valori di get_feed');
select is((select count(*)::int from get_post(:'hidden')), 0, 'get_post: nessuna riga per un post di uno sconosciuto');
select is((select count(*)::int from get_post(:'old')), 0, 'get_post: nessuna riga per un post scaduto');
select is((select count(*)::int from get_post(gen_random_uuid())), 0, 'get_post: nessuna riga per un id inesistente');

-- get_post_likers: solo l'autore
select is((select array_agg(handle order by liked_at) from get_post_likers(:'mine')), array['volpe.viola', 'gatto.blu'],
  'likers: chi ha messo like al mio post, dal più vecchio, senza l''account cancellato');
select is((select array_agg(user_id order by liked_at) from get_post_likers(:'mine')), array[:'fa'::uuid, :'fb'::uuid],
  'likers: user_id coerente con l''handle');
select is((select count(*)::int from get_post_likers(:'mine', 1)), 1, 'likers: rispetta il limite');
select throws_ok(format($$select * from get_post_likers(%L)$$, :'theirs'), 'NOT_FOUND',
  'likers: chi non è l''autore (anche se vede il post) riceve NOT_FOUND');
select throws_ok(format($$select * from get_post_likers(%L)$$, gen_random_uuid()), 'NOT_FOUND', 'likers: post inesistente = NOT_FOUND');

-- blocchi: un like di un utente bloccato sparisce dall'elenco
reset role;
insert into blocks (blocker_id, blocked_id) values (:'me', :'fb');
select tests.authenticate_as(:'me');
select is((select array_agg(handle) from get_post_likers(:'mine')), array['volpe.viola'], 'likers: i bloccati sono esclusi');

-- gli altri non sono l'autore
reset role;
select tests.authenticate_as(:'fa');
select throws_ok(format($$select * from get_post_likers(%L)$$, :'mine'), 'NOT_FOUND', 'likers: un follower accettato non vede chi ha messo like');
reset role;
select tests.authenticate_as(:'pend');
select is((select count(*)::int from get_post(:'mine')), 0, 'get_post: una richiesta pending non sblocca il post');

reset role;
select ok(not has_function_privilege('anon', 'get_post(uuid)', 'execute')
      and not has_function_privilege('anon', 'get_post_likers(uuid, int)', 'execute')
      and not has_function_privilege('anon', 'get_my_activity(timestamptz)', 'execute'), 'anon non esegue le tre RPC');

select * from finish();
rollback;
