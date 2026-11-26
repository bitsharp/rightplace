begin;
\ir helpers/setup.psql
select plan(26);

-- Fixtures: the window is "now + 0..3 hours" in the city time zone; levels are set relative to now() so the test never
-- depends on the hour it runs.
insert into public.cities (slug, name, country, center, default_zoom, timezone, taxi_phone, is_active)
select 'hourtown', 'Hourtown', 'IT', center, default_zoom, 'Europe/Rome', taxi_phone, true from public.cities where slug = 'milano';
insert into public.cities (slug, name, country, center, default_zoom, timezone, taxi_phone, is_active)
select 'captown', 'Captown', 'IT', center, default_zoom, 'Europe/Rome', taxi_phone, true from public.cities where slug = 'milano';

create function tests.set_typical_at(p_venue uuid, p_offset int, p_level int) returns void language sql as $$
  insert into venue_typical_busyness (venue_id, weekday, hour, level, source)
  select p_venue, extract(dow from t)::int, extract(hour from t)::int, p_level, 'manual'
    from (select (now() + make_interval(hours => p_offset)) at time zone 'Europe/Rome' as t) x
  on conflict (venue_id, weekday, hour, source) do update set level = excluded.level
$$;

select tests.make_venue('Sempre tre', 'club', 'hourtown') as va \gset
select tests.make_venue('Tre solo ora', 'club', 'hourtown') as vb \gset
select tests.make_venue('Due sempre', 'club', 'hourtown') as vc \gset
select tests.make_venue('Due solo tardi', 'club', 'hourtown') as vd \gset
select tests.make_venue('Uno sempre', 'club', 'hourtown') as ve \gset
select tests.make_venue('Tre fra sei ore', 'club', 'hourtown') as vf \gset
select tests.make_venue('Spot tre', 'spot', 'hourtown') as vg \gset
select tests.set_typical_at(:'va', h, 3) from generate_series(0, 3) h;
select tests.set_typical_at(:'vb', 0, 3);
select tests.set_typical_at(:'vc', h, 2) from generate_series(0, 3) h;
select tests.set_typical_at(:'vd', 3, 2);
select tests.set_typical_at(:'ve', h, 1) from generate_series(0, 3) h;
select tests.set_typical_at(:'vf', 6, 3);
select tests.set_typical_at(:'vg', h, 3) from generate_series(0, 3) h;

select id as hid from cities where slug = 'hourtown' \gset

-- Ranking -----------------------------------------------------------------------------------------------------
select is(has_function_privilege('authenticated', 'private.busiest_ranking(uuid, timestamptz)', 'execute'), false,
  'il ranking non è eseguibile dai client');
select ok(obj_description('private.busiest_ranking(uuid, timestamptz)'::regprocedure, 'pg_proc') is not null, 'il ranking ha COMMENT');
select is((select array_agg(venue_id order by rn) from private.busiest_ranking(:'hid')), array[:'va', :'vb', :'vc', :'vd']::uuid[],
  'ordine: livello massimo, poi somma dei livelli nella finestra');
select is((select array_agg(lvl order by rn) from private.busiest_ranking(:'hid')), array[3, 3, 2, 2]::smallint[], 'lvl = massimo nelle 4 ore');
select is((select array_agg(score order by rn) from private.busiest_ranking(:'hid')), array[12, 3, 8, 2]::int[], 'score = somma dei livelli');
select is((select count(*)::int from private.busiest_ranking(:'hid') where venue_id in (:'ve', :'vf', :'vg')), 0,
  'solo lvl >= 2: niente livello 1, niente fuori finestra, niente spot');
select is((select array_agg(rn order by rn) from private.busiest_ranking(:'hid')), array[1, 2, 3, 4], 'rn parte da 1 senza buchi');
select is((select array_agg(venue_id order by rn) from private.busiest_ranking(:'hid', now() + interval '6 hours')), array[:'vf']::uuid[],
  'p_at sposta la finestra di 4 ore');
select is((select array_agg(venue_id order by rn) from private.busiest_ranking(:'hid')),
          (select array_agg(venue_id order by rn) from private.busiest_ranking(:'hid')), 'ranking deterministico nel giorno');

-- Hash tie-break: two venues identical in level and score keep the same order across calls
select tests.make_venue('Gemello 1', 'club', 'hourtown') as vt1 \gset
select tests.make_venue('Gemello 2', 'club', 'hourtown') as vt2 \gset
select tests.set_typical_at(:'vt1', h, 3) from generate_series(0, 3) h;
select tests.set_typical_at(:'vt2', h, 3) from generate_series(0, 3) h;
select is((select count(*)::int from private.busiest_ranking(:'hid') where rn in (1, 2) and venue_id in (:'va', :'vt1', :'vt2')), 2,
  'a parità di lvl e score decide l''hash, ma restano davanti a chi ha score minore');
select is((select array_agg(venue_id order by rn) from private.busiest_ranking(:'hid') where venue_id in (:'vt1', :'vt2')),
          (select array_agg(venue_id order by rn) from private.busiest_ranking(:'hid') where venue_id in (:'vt1', :'vt2')),
  'a parità: stesso ordine a ogni chiamata');

-- Generation: the same venues as the ranking (max 14 per city) ----------------------------------------------------
create temp table cap_venues as
  select tests.make_venue('Cap ' || lpad(i::text, 2, '0'), 'club', 'captown') as venue_id from generate_series(1, 20) i;
select tests.set_typical_at(venue_id, h, 3) from cap_venues, generate_series(0, 3) h;
select public.current_night_date(:'hid') as night \gset
select private.generate_night_bots(:'night'::date);

select is((select count(*)::int from private.night_bot_presence where night_date = :'night'::date
              and venue_id in (select venue_id from private.busiest_ranking(:'hid'))),
          (select count(*)::int from private.busiest_ranking(:'hid')), 'ogni venue del ranking (fino a 14) ha le stime');
select is((select count(*)::int from private.night_bot_presence where venue_id in (:'ve', :'vf', :'vg')), 0,
  'fuori finestra, livello 1 e spot: niente stime');
select is((select count(*)::int from private.night_bot_presence p join cap_venues using (venue_id) where p.night_date = :'night'::date), 14,
  'al massimo 14 per città');
select is((select array_agg(venue_id order by venue_id) from private.night_bot_presence p
            where p.night_date = :'night'::date and venue_id in (select venue_id from cap_venues)),
          (select array_agg(venue_id order by venue_id) from private.busiest_ranking((select id from cities where slug = 'captown')) where rn <= 14),
  'le 14 sono i primi 14 del ranking');

-- Same ranking → same numbers during the night
create temp table run1 as select venue_id, going, maybe from private.night_bot_presence where night_date = :'night'::date;
select private.generate_night_bots(:'night'::date);
select is((select count(*)::int from (select * from run1 except
            select venue_id, going, maybe from private.night_bot_presence where night_date = :'night'::date) d), 0,
  'rigenerata: stessi numeri per chi resta nella selezione');
select is((select count(*)::int from private.night_bot_presence where night_date = :'night'::date), (select count(*)::int from run1),
  'rigenerare non duplica le righe');
select ok((select bool_and(going between 10 and 35 and maybe between 4 and 14) from private.night_bot_presence
            where night_date = :'night'::date and venue_id = :'va'), 'lvl 3: going 10-35, maybe 4-14');
select ok((select bool_and(going between 3 and 12 and maybe between 1 and 6) from private.night_bot_presence
            where night_date = :'night'::date and venue_id = :'vc'), 'lvl 2: going 3-12, maybe 1-6');

-- get_busiest_tonight: its first 5 are all venues with estimates ----------------------------------------------------
select tests.authenticate_as(tests.create_user(tests.unique_handle('hr'), 25));
create temp table busy_h as select * from get_busiest_tonight('hourtown', 20);
create temp table busy_c as select * from get_busiest_tonight('captown');
reset role;
select is((select count(*)::int from busy_h b
            where b.venue_id not in (select venue_id from private.night_bot_presence where night_date = :'night'::date)), 0,
  'la card mostra solo locali che hanno stime (hourtown)');
select is((select count(*)::int from busy_c where is_estimate), 5, 'captown: i primi 5 della card hanno tutti le stime');
select is((select array_agg(venue_id order by ord) from (select venue_id, row_number() over () as ord from busy_h) x),
          (select array_agg(venue_id order by rn) from private.busiest_ranking(:'hid')),
  'la card segue l''ordine del ranking');
select is((select count(*)::int from busy_h where venue_id in (:'ve', :'vf', :'vg')), 0,
  'la card esclude fuori finestra, livello 1 e spot');

-- Job and switch --------------------------------------------------------------------------------------------------
select is((select schedule from cron.job where jobname = 'generate-night-bots'), '2 * * * *', 'job pg_cron ogni ora al minuto 2');
select ok((select command like '%delete from private.night_bot_presence%' from cron.job where jobname = 'generate-night-bots'),
  'il job cancella ancora le righe vecchie');
update private.feature_flags set enabled = false where name = 'night_bots';
select is(private.generate_night_bots(:'night'::date), 0, 'flag spento: il generatore non scrive');

select * from finish();
rollback;
