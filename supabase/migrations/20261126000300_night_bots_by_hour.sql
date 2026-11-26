-- Prompt 25, follow-up (feedback from Luca): estimated presence sits on the venues that are "di solito" busiest in the
-- hours being looked at (now + the next 3 hours), the same venues the "I più animati" card lists.
-- Same guarantees as 20261126000100_night_bots.sql: turnout only, estimates never unlock personal statistics.

-- ---------------------------------------------------------------- single source of the ranking
create or replace function private.busiest_ranking(p_city uuid, p_at timestamptz default now())
returns table (venue_id uuid, lvl smallint, score int, rn int)
language sql stable security definer set search_path = public as $$
  with levels as (
    select v.id as venue_id, c.timezone,
           max(public.typical_level(v.id, p_at + make_interval(hours => h)))::smallint as lvl,
           sum(public.typical_level(v.id, p_at + make_interval(hours => h)))::int as score
      from public.venues v
      join public.cities c on c.id = v.city_id
      cross join generate_series(0, 3) h
     where v.city_id = p_city and v.is_active and v.kind <> 'spot'
     group by v.id, c.timezone
  )
  select l.venue_id, l.lvl, l.score,
         -- the hash tie-break depends on the night, so equal venues rotate day by day but stay put during the night
         row_number() over (order by l.lvl desc, l.score desc,
           hashtext(l.venue_id::text || (((p_at at time zone l.timezone) - interval '6 hours')::date)::text))::int
    from levels l
   where l.lvl >= 2
$$;
comment on function private.busiest_ranking(uuid, timestamptz) is
  'Venues of a city ranked by how busy they are "di solito" in the window p_at .. p_at + 3 hours (level = max, score = sum, level >= 2 only, spots excluded); catalog and typical layer only, no personal data. Single source for get_busiest_tonight and generate_night_bots.';
revoke all on function private.busiest_ranking(uuid, timestamptz) from public, anon, authenticated;
grant execute on function private.busiest_ranking(uuid, timestamptz) to service_role;

-- ---------------------------------------------------------------- "I più animati del {giorno}" on the shared ranking
create or replace function public.get_busiest_tonight(p_city_slug text, p_limit int default 5)
returns table (
  venue_id uuid, name text, kind text, typical_level smallint, cover_photo_url text,
  going_band text, maybe_band text, is_estimate boolean
)
language plpgsql stable security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare
  v_city uuid;
  v_night date;
begin
  perform private.require_user();
  v_city := private.active_city(p_city_slug);
  v_night := public.current_night_date(v_city);
  return query
  with real as (
    select t.venue_id, count(*) filter (where t.intent = 'going')::int as going,
           count(*) filter (where t.intent = 'maybe')::int as maybe
      from private.tonight_declarations(v_city) t group by t.venue_id
  )
  select v.id, v.name, v.kind, k.lvl,
         case when private.feature_enabled('venue_photo_apify') and v.photo_fetched_at > now() - interval '60 days'
              then v.photo_url end,
         public.attendance_band(coalesce(r.going, 0) + nb.going),
         public.attendance_band(coalesce(r.maybe, 0) + nb.maybe),
         (nb.going + nb.maybe) > 0
    from private.busiest_ranking(v_city) k
    join public.venues v on v.id = k.venue_id
    left join real r on r.venue_id = v.id
    cross join lateral private.night_bot_counts(v.id, v_night) nb
   order by k.rn
   limit least(greatest(coalesce(p_limit, 5), 1), 20);
end $$;
comment on function public.get_busiest_tonight(text, int) is
  'Privacy: no personal data; venues most busy "di solito" now or in the next 3 hours (private.busiest_ranking: level, then sum of levels, then a per-night hash), with catalog fields and tonight turnout bands only (real + estimated presence, is_estimate); spots excluded.';

-- ---------------------------------------------------------------- generation: the top 14 of the ranking per city
create or replace function private.generate_night_bots(
  p_night date default (((now() at time zone 'Europe/Rome') - interval '6 hours')::date)
) returns int
language plpgsql security definer set search_path = public as $$
declare
  -- Ranges (inclusive) of estimated going/maybe by level in the window; level 1 and 0 get none.
  c_going_l3 constant int[] := array[10, 35];
  c_maybe_l3 constant int[] := array[4, 14];
  c_going_l2 constant int[] := array[3, 12];
  c_maybe_l2 constant int[] := array[1, 6];
  c_max_per_city constant int := 14;
  v_written int;
begin
  if not private.feature_enabled('night_bots') then
    return 0;
  end if;
  delete from private.night_bot_presence where night_date = p_night;

  with ranked as (
    -- the window is now .. now + 3 h: the job runs hourly, so the selection follows the hours people are looking at;
    -- numbers depend only on (venue, night, level), so a venue that stays selected keeps them during the night
    select r.venue_id, r.lvl
      from public.cities c
      cross join lateral private.busiest_ranking(c.id) r
     where c.is_active and r.rn <= c_max_per_city
  ),
  ins as (
    insert into private.night_bot_presence (venue_id, night_date, going, maybe)
    select r.venue_id, p_night,
           (case when r.lvl = 3 then c_going_l3[1] else c_going_l2[1] end)
             + mod(abs(hashtext(r.venue_id::text || p_night::text || 'g')::bigint),
                   (case when r.lvl = 3 then c_going_l3[2] - c_going_l3[1] else c_going_l2[2] - c_going_l2[1] end) + 1),
           (case when r.lvl = 3 then c_maybe_l3[1] else c_maybe_l2[1] end)
             + mod(abs(hashtext(r.venue_id::text || p_night::text || 'm')::bigint),
                   (case when r.lvl = 3 then c_maybe_l3[2] - c_maybe_l3[1] else c_maybe_l2[2] - c_maybe_l2[1] end) + 1)
      from ranked r
    returning 1
  )
  select count(*)::int into v_written from ins;
  return v_written;
end $$;
comment on function private.generate_night_bots(date) is
  'Writes estimated turnout (no people) for the top 14 venues of private.busiest_ranking in each active city (the venues "di solito" busiest now and in the next 3 hours); reads the typical layer only, never declarations; does nothing when the night_bots flag is off.';

-- Hourly, so the estimates follow the hours on the map (minute 2: after the typical layer is refreshed on the hour);
-- also purges rows older than two days. Replaces the daily 05:10 UTC job.
select cron.unschedule('generate-night-bots');
select cron.schedule('generate-night-bots', '2 * * * *',
  $job$select private.generate_night_bots(); delete from private.night_bot_presence where night_date < current_date - 2$job$);

-- Regenerate right away (idempotent; does nothing with the flag off).
select private.generate_night_bots();
