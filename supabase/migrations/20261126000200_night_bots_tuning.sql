-- Prompt 25, tuning (feedback from Luca on the map): fewer and more varied estimated presences.
-- Same guarantees as 20261126000100_night_bots.sql (turnout only, estimates never unlock personal statistics);
-- only the selection of venues and the numbers change.
create or replace function private.generate_night_bots(
  p_night date default (((now() at time zone 'Europe/Rome') - interval '6 hours')::date)
) returns int
language plpgsql security definer set search_path = public as $$
declare
  -- Ranges (inclusive) of estimated going/maybe by peak typical level of the evening; level 1 and 0 get none.
  c_going_l3 constant int[] := array[10, 35];
  c_maybe_l3 constant int[] := array[4, 14];
  c_going_l2 constant int[] := array[3, 12];
  c_maybe_l2 constant int[] := array[1, 6];
  c_max_per_city constant int := 14;
  -- Of the level-2 venues only about one in c_l2_share_one_in is picked each night (by hash of venue + date).
  c_l2_share_one_in constant int := 3;
  v_written int;
begin
  if not private.feature_enabled('night_bots') then
    return 0;
  end if;
  delete from private.night_bot_presence where night_date = p_night;

  with peak as (
    -- peak of the "di solito" layer (history > manual > apify, via typical_level) over 21:00-02:59 of the night
    select v.id as venue_id, v.city_id,
           (select max(public.typical_level(v.id, ((p_night::timestamp + make_interval(hours => h)) at time zone c.timezone)))
              from generate_series(21, 26) h) as lvl
      from public.venues v join public.cities c on c.id = v.city_id
     where v.is_active and c.is_active and v.kind <> 'spot'
  ),
  candidates as (
    select p.venue_id, p.city_id, p.lvl
      from peak p
     where p.lvl = 3
        or (p.lvl = 2 and mod(abs(hashtext(p.venue_id::text || p_night::text || 's')::bigint), c_l2_share_one_in) = 0)
  ),
  ranked as (
    select c.venue_id, c.lvl,
           row_number() over (partition by c.city_id order by c.lvl desc, hashtext(c.venue_id::text || p_night::text)) as rn
      from candidates c
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
      from ranked r where r.rn <= c_max_per_city
    returning 1
  )
  select count(*)::int into v_written from ins;
  return v_written;
end $$;
comment on function private.generate_night_bots(date) is
  'Writes estimated turnout (no people) for the busiest venues of each active city (max 14: all peak-level-3 venues, then about one in three of level 2, picked by hash per day); reads the typical layer only, never declarations; does nothing when the night_bots flag is off.';

-- Regenerate tonight right away (idempotent; does nothing with the flag off).
select private.generate_night_bots();
