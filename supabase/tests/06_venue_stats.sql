begin;
\ir helpers/setup.psql
select plan(15);

select tests.create_user('lince.rosso') as me \gset
select tests.create_user('volpe.viola', 20, 'female') as friend \gset
select tests.create_user('orso.grigio', 30, 'male') as pending_friend \gset
select tests.make_venue('Piccolo') as v_small \gset
select tests.make_venue('Medio') as v_mid \gset
select tests.make_venue('Grande') as v_big \gset

select tests.make_crowd(:'v_small', 2, 'going', 24, 'female');
select tests.make_crowd(:'v_mid', 2, 'going', 20, 'female');
select tests.make_crowd(:'v_mid', 1, 'going', 30, 'male');
select tests.make_crowd(:'v_big', 10, 'going', 25, 'male');
select tests.make_crowd(:'v_big', 2, 'maybe', 25, 'female');
select tests.make_declaration(:'friend', :'v_big', 'maybe');
select tests.make_declaration(:'pending_friend', :'v_big', 'going');
select tests.follow(:'me', :'friend');
select tests.follow(:'me', :'pending_friend', 'pending');

select tests.authenticate_as(:'me');
select is((select avg_age from get_venue_stats(:'v_small', 'all')), null, '2 dichiarati → età media nascosta');
select is((select female_pct from get_venue_stats(:'v_small', 'all')), null, '2 dichiarati → percentuali nascoste');
select is((select going_band from get_venue_stats(:'v_small', 'all')), 'pochi', '2 dichiarati → pochi');
select is((select round(avg_age) from get_venue_stats(:'v_mid', 'all')), 23::numeric, '3 dichiarati → età media visibile');
select is((select female_pct from get_venue_stats(:'v_mid', 'all')), 67, '3 dichiarati → percentuale donne visibile');
select is((select male_pct from get_venue_stats(:'v_mid', 'all')), 33, 'e percentuale uomini');
select is((select going_band from get_venue_stats(:'v_big', 'maybe')), '10–20', 'le fasce non dipendono dal segmento');
-- v_big: 3 maybe (2 crowd + friend) → visible; check the k-rule on the segment instead with v_small-like data
select is((select avg_age from get_venue_stats(:'v_mid', 'maybe')), null,
  'segmento maybe senza dichiarati → NULL anche se i going sono 3');
reset role;
delete from declarations d using profiles p where d.user_id = p.id and p.id = :'friend';
select tests.authenticate_as(:'me');
select is((select avg_age from get_venue_stats(:'v_big', 'maybe')), null,
  'segmento maybe con 2 maybe → NULL anche se i going sono 10');
select isnt((select avg_age from get_venue_stats(:'v_big', 'going')), null, 'segmento going con 10 → visibile');

reset role;
select tests.make_declaration(:'friend', :'v_big', 'maybe');
select tests.authenticate_as(:'me');
select is((select jsonb_array_length(friends) from get_venue_stats(:'v_big', 'all')), 1,
  'friends elenca solo i seguiti accettati, non i pending');
select is((select friends -> 0 ->> 'handle' from get_venue_stats(:'v_big', 'all')), 'volpe.viola', 'con il loro handle');
select is((select (friends -> 0) ?| array['birth_date', 'email', 'coarse_location'] from get_venue_stats(:'v_big', 'all')), false,
  'friends non contiene dati privati');

-- differencing attack: "all" = 3 going + 1 maybe would reveal the lone maybe's age by subtraction
reset role;
select tests.make_crowd(:'v_mid', 1, 'maybe', 50, 'male');
select tests.authenticate_as(:'me');
select isnt((select avg_age from get_venue_stats(:'v_mid', 'going')), null, '3 going → visibili');
select is((select avg_age from get_venue_stats(:'v_mid', 'all')), null,
  'segmento all nascosto se un sottogruppo ha 1–2 persone (niente attacco per differenza)');

select * from finish();
rollback;
