begin;
\ir helpers/setup.psql
select plan(9);

select tests.make_venue('Manuale') as v \gset
insert into venue_typical_busyness (venue_id, weekday, hour, level, source) values (:'v', 6, 23, 3, 'manual');

-- typical_level reads the weekday/hour in the city time zone (Saturday 23:00 Rome = 21:00 UTC)
select is(typical_level(:'v', '2026-10-24 23:00:00 Europe/Rome'), 3::smallint, 'sabato 23:00 Roma su cella manual 3 → 3');
select is(typical_level(:'v', '2026-10-24 21:00:00 Europe/Rome'), 0::smallint, 'cella mancante → 0');
insert into venue_typical_busyness (venue_id, weekday, hour, level, source) values (:'v', 6, 23, 1, 'history');
select is(typical_level(:'v', '2026-10-24 23:00:00 Europe/Rome'), 1::smallint, 'con una riga history vince la storia');

-- refresh_typical_from_history works on expired declarations, aggregated per night
create function tests.past_night(p_venue uuid, p_weeks_ago int, p_count int) returns void language plpgsql as $$
declare v_night uuid; v_user uuid;
begin
  v_night := private.ensure_night(p_venue,
    public.current_night_date((select city_id from public.venues where id = p_venue)) - p_weeks_ago * 7);
  for i in 1..p_count loop
    v_user := tests.create_user(tests.unique_handle('storia'));
    insert into declarations (user_id, night_id, intent) values (v_user, v_night, 'going');
  end loop;
  update declarations set expires_at = now() - interval '1 hour' where night_id = v_night;
end $$;

select tests.make_venue('Due serate') as v_two \gset
select tests.make_venue('Poca gente') as v_low \gset
select tests.make_venue('Storico') as v_hist \gset
insert into venue_typical_busyness (venue_id, weekday, hour, level, source)
select :'v_hist'::uuid, d, h, 3, 'manual' from generate_series(0, 6) d, generate_series(0, 23) h;

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
select is((select array_agg(distinct level) from venue_typical_busyness where venue_id = :'v_hist' and source = 'manual'),
  array[3::smallint], 'la riga manual resta intatta');
select set_eq(
  $$ select column_name::text from information_schema.columns where table_schema = 'public' and table_name = 'night_hour_stats' $$,
  array['venue_id', 'weekday', 'hour', 'samples', 'avg_declared', 'updated_at'],
  'night_hour_stats contiene solo aggregati, mai utenti');

select * from finish();
rollback;
