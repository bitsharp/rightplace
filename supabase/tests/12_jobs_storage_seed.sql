begin;
\ir helpers/setup.psql
select plan(12);

select ok(
  array['purge-expired-content', 'purge-contact-hashes', 'expire-coarse-locations', 'daily-cleanup',
        'expire-sponsorships', 'refresh-typical-from-history'] <@ (select array_agg(jobname::text) from cron.job),
  'tutti i job pg_cron sono registrati');

-- purge job: expired rooms, messages and posts disappear
select tests.create_user('lince.rosso') as a \gset
select tests.make_venue('Test Club') as v \gset
select tests.make_declaration(:'a', :'v') as decl \gset
select id as room from chat_rooms where night_id = (select night_id from declarations where id = :'decl') \gset
insert into chat_messages (room_id, user_id, kind, text) values (:'room', :'a', 'text', 'ciao');
update chat_rooms set expires_at = now() - interval '1 minute' where id = :'room';
select tests.make_post(:'a', :'v', now() - interval '8 days', now() - interval '1 minute') as old_post \gset
select private.purge_expired_content();
select is((select count(*)::int from chat_rooms where id = :'room'), 0, 'la chat scaduta è cancellata');
select is((select count(*)::int from chat_messages where room_id = :'room'), 0, 'con i suoi messaggi');
select is((select count(*)::int from posts where id = :'old_post'), 0, 'i post scaduti sono cancellati');

insert into contact_hashes_tmp (user_id, hash, created_at) values (:'a', repeat('e', 64), now() - interval '11 minutes');
select private.purge_contact_hashes();
select is((select count(*)::int from contact_hashes_tmp), 0, 'gli hash dei contatti durano al massimo 10 minuti');

update profiles set location_opt_in = true, coarse_location_at = now() - interval '4 hours',
  coarse_location = coarsen(extensions.st_setsrid(extensions.st_makepoint(9.19, 45.46), 4326)::extensions.geography)
 where id = :'a';
select private.expire_coarse_locations();
select is((select coarse_location from profiles where id = :'a'), null, 'la posizione più vecchia di 3 ore viene cancellata');

-- storage: private buckets, uploads only in your own prefix
select is((select count(*)::int from storage.buckets where id in ('posts', 'chat-photos') and not public), 2,
  'i bucket posts e chat-photos sono privati');
select tests.authenticate_as(:'a');
select lives_ok(format($$ insert into storage.objects (bucket_id, name, owner) values ('posts', %L, %L) $$,
  :'a' || '/foto.jpg', :'a'), 'upload nel proprio prefisso');
select throws_ok(format($$ insert into storage.objects (bucket_id, name, owner) values ('posts', %L, %L) $$,
  gen_random_uuid() || '/foto.jpg', :'a'), '42501', null, 'upload nel prefisso di un altro rifiutato');
select is((select count(*)::int from storage.objects), 0, 'nessuna lettura diretta degli oggetti: solo signed URL');
reset role;

-- seed
select is((select array_agg(slug order by slug) from cities where is_active), array['milano'], 'solo Milano è attiva');
select is((select count(*)::int from venues where name like '% (demo)' and google_place_id like 'demo-%'), 20,
  '20 locali di Milano dichiaratamente finti');

select * from finish();
rollback;
