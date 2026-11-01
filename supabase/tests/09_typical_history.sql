begin;
\ir helpers/setup.psql
select plan(9);

select tests.make_venue('Manuale') as v \gset
insert into venue_typical_busyness (venue_id, weekday, hour, level, source) values (:'v', 6, 23, 3, 'manual');

-- typical_level reads the weekday/hour in the city time zone (Saturday 23:00 Rome = 21:00 UTC)
select is(typical_level(:'v', '2026-10-24 23:00:00 Europe/Rome'), 3::smallint, 'sabato 23:00 Roma su cella manual 3 → 3');
select is(typical_level(:'v', '2026-10-24 21:00:00 Europe/Rome'), 0::smallint, 'cella mancante → 0');
insert into venue_typical_busyness (venue_id, weekday, hour, level, source) values (:'v', 6, 23, 1, 'history')
on conflict (venue_id, weekday, hour) do update set level = excluded.level, source = excluded.source;
select is(typical_level(:'v', '2026-10-24 23:00:00 Europe/Rome'), 1::smallint, 'con una riga history vince la storia');

-- refresh_typical_from_history works on expired declarations, aggregated per night
create function tests.past_night(p_venue uuid, p_weeks_ago int, p_count int) returns void language plpgsql as $$
declare v_night uuid; v_user uuid;
begin
  v_night := private.ensure_night(p_venue, (date '2026-10-24' - p_weeks_ago * 7));
  for i in 1..p_count loop
    v_user := tests.create_user('storia.' || p_weeks_ago || '.' || i || '.' || left(gen_random_uuid()::text, 6));
    insert into declarations (user_id, night_id, intent) values (v_user, v_night, 'going');
  end loop;
  update declarations set expires_at = now() - interval '1 hour' where night_id = v_night;
end $$;

select tests.make_venue('Due serate') as v_two \gset
select tests.make_venue('Poca gente') as v_low \gset
select tests.make_venue('Storico') as v_hist \gset
insert into venue_typical_busyness (venue_id, weekday, hour, level, source) values (:'v_hist', 6, 23, 3, 'manual');

select tests.past_night(:'v_two', 1, 20); select tests.past_night(:'v_two', 2, 20);
select tests.past_night(:'v_low', 1, 2); select tests.past_night(:'v_low', 2, 2); select tests.past_night(:'v_low', 3, 2);
select tests.past_night(:'v_hist', 1, 12); select tests.past_night(:'v_hist', 2, 12); select tests.past_night(:'v_hist', 3, 12);

select lives_ok($$ select private.refresh_typical_from_history() $$, 'il job storico gira');
select is((select count(*)::int from venue_typical_busyness where venue_id = :'v_two' and source = 'history'), 0,
  '2 serate con 20 dichiarati → nessuna riga history');
select is((select count(*)::int from venue_typical_busyness where venue_id = :'v_low' and source = 'history'), 0,
  '3 serate con media 2 → nessuna riga history');
select is((select level from venue_typical_busyness where venue_id = :'v_hist' and source = 'history' limit 1), 2::smallint,
  '3 serate con media 12 → history level 2');
select is((select level from venue_typical_busyness where venue_id = :'v_hist' and weekday = 6 and hour = 23), 2::smallint,
  'la cella sabato 23 ora viene dalla storia');
select is((select count(*)::int from night_hour_stats where samples < 3 and avg_declared >= 3 and venue_id = :'v_two'), 
  (select count(*)::int from night_hour_stats where venue_id = :'v_two'),
  'night_hour_stats contiene solo aggregati, mai utenti');

select * from finish();
rollback;
