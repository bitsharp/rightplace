begin;
\ir helpers/setup.psql
select plan(14);


select tests.create_user('lince.rosso') as me \gset
select tests.create_user('volpe.viola') as friend \gset
select tests.make_venue('Vuoto e chiuso') as v_empty \gset
select tests.make_venue('Due e animato') as v_typical \gset
select tests.make_venue('Tre persone') as v_hot \gset
select tests.make_venue('Locale dell''amico') as v_friend \gset
select tests.make_venue('Spento', 'bar') as v_inactive \gset
update venues set is_active = false where id = :'v_inactive';

-- Typical layer: fill every hour so the test does not depend on the clock
insert into venue_typical_busyness (venue_id, weekday, hour, level, source)
select :'v_typical'::uuid, d, h, 2, 'manual' from generate_series(0, 6) d, generate_series(0, 23) h;

select tests.make_crowd(:'v_empty', 2);
select tests.make_crowd(:'v_typical', 2);
select tests.make_crowd(:'v_hot', 3);
select tests.make_crowd(:'v_inactive', 5);
select tests.make_declaration(:'friend', :'v_friend', 'maybe');
select tests.follow(:'me', :'friend');

select tests.authenticate_as(:'me');
create temp table general_map as select * from get_city_map('milano', 'general');

select is((select count(*)::int from general_map where venue_id = :'v_empty'), 0,
  '2 dichiarati e typical_level 0 → il locale non compare');
select is((select going_band from general_map where venue_id = :'v_typical'), 'pochi',
  '2 dichiarati e typical_level 2 → presente con going_band pochi');
select is((select typical_level from general_map where venue_id = :'v_typical'), 2::smallint,
  'il typical dot porta il suo typical_level');
select is((select is_hot_spot from general_map where venue_id = :'v_typical'), false,
  'sotto k=3 è un typical dot, non un hot spot');
select is((select going_band from general_map where venue_id = :'v_hot'), '3–10', '3 dichiarati → 3–10');
select is((select is_hot_spot from general_map where venue_id = :'v_hot'), true, 'con 3 dichiarati è un hot spot');
select is((select typical_level from general_map where venue_id = :'v_hot'), 0::smallint,
  'i due strati non si sommano: typical_level resta quello del locale');
select is((select count(*)::int from general_map where venue_id = :'v_inactive'), 0, 'i locali non attivi non compaiono');
select is((select friends_going from general_map where venue_id = :'v_hot'), null, 'la vista generale non elenca amici');

create temp table friends_map as select * from get_city_map('milano', 'friends');
select is((select count(*)::int from friends_map), 1, 'la vista amici mostra solo i locali dei miei seguiti');
select is((select friends_going from friends_map where venue_id = :'v_friend'), array['volpe.viola'],
  'con l''handle del mio seguito');
select is((select friends_count from friends_map where venue_id = :'v_friend'), 1, 'e il numero di amici');

reset role;
update follows set status = 'pending' where follower_id = :'me';
select tests.authenticate_as(:'me');
select is((select count(*)::int from get_city_map('milano', 'friends')), 0, 'un follow pending non conta nella mappa amici');
select throws_ok($$ select * from get_city_map('milano', 'tutto') $$, 'INVALID_ARGUMENT', 'vista sconosciuta rifiutata');

select * from finish();
rollback;
