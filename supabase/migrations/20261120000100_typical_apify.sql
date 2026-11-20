-- "Di solito" layer from Apify (roadmap 21, principle 11): a third source, 'apify', with the lowest precedence.
-- Only level 0-3 per (venue, weekday, hour) is ever stored: no raw histogram, no "live" data, nothing else.
-- Kill switch: delete from public.venue_typical_busyness where source = 'apify';

alter table public.venue_typical_busyness drop constraint if exists venue_typical_busyness_source_check;
alter table public.venue_typical_busyness
  add constraint venue_typical_busyness_source_check check (source in ('manual', 'history', 'apify'));

-- Precedence: our history (k >= 3) > manual curation > Apify. Same signature and output as before.
create or replace function public.typical_level(p_venue_id uuid, p_at timestamptz) returns smallint
language sql stable as $$
  select coalesce((
    select b.level
      from public.venue_typical_busyness b
      join public.venues v on v.id = b.venue_id
      join public.cities c on c.id = v.city_id
     where b.venue_id = p_venue_id
       and b.weekday = extract(dow from p_at at time zone c.timezone)
       and b.hour = extract(hour from p_at at time zone c.timezone)
     order by case b.source when 'history' then 0 when 'manual' then 1 else 2 end
     limit 1
  ), 0)::smallint
$$;

-- p_rows: [{google_place_id, weekday 0-6 (0 = Sunday), hour 0-23, level 0-3}]. Validation errors abort the call.
-- Rows of unknown / inactive / other-city / spot venues are ignored (counted in a notice). For every known venue
-- in the payload its source='apify' rows are replaced atomically; manual and history rows are never touched.
create or replace function public.import_typical_apify(p_city_slug text, p_rows jsonb) returns int
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_city uuid;
  v_written int;
  v_ignored int;
  v_cleaned jsonb;
begin
  select id into v_city from public.cities where slug = p_city_slug;
  if v_city is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  if exists (select 1 from jsonb_to_recordset(p_rows) as t(google_place_id text, weekday int, hour int, level int)
              where google_place_id is null or weekday is null or hour is null or level is null
                 or weekday not between 0 and 6 or hour not between 0 and 23 or level not between 0 and 3) then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('venue_id', c.venue_id, 'weekday', c.weekday, 'hour', c.hour, 'level', c.level)), '[]')
    into v_cleaned
    from (select distinct on (v.id, t.weekday, t.hour) v.id as venue_id, t.weekday, t.hour, t.level
            from jsonb_to_recordset(p_rows) as t(google_place_id text, weekday int, hour int, level int)
            join public.venues v on v.google_place_id = t.google_place_id
             and v.city_id = v_city and v.is_active and v.kind <> 'spot'
           order by v.id, t.weekday, t.hour) c;

  delete from public.venue_typical_busyness b
   where b.source = 'apify'
     and b.venue_id in (select (r ->> 'venue_id')::uuid from jsonb_array_elements(v_cleaned) r);
  insert into public.venue_typical_busyness (venue_id, weekday, hour, level, source)
  select r.venue_id, r.weekday, r.hour, r.level, 'apify'
    from jsonb_to_recordset(v_cleaned) as r(venue_id uuid, weekday int, hour int, level int);
  get diagnostics v_written = row_count;
  v_ignored := jsonb_array_length(p_rows) - v_written;
  if v_ignored > 0 then
    raise notice 'import_typical_apify: % righe ignorate (venue sconosciuti, spenti, spot o duplicati)', v_ignored;
  end if;
  return v_written;
end $$;
comment on function public.import_typical_apify(text, jsonb) is
  'Privacy: service_role only; writes only level 0-3 per venue/weekday/hour from a third-party source (Apify), no personal data; replaces only the apify rows of the listed venues, never manual or history.';

revoke all on function public.import_typical_apify(text, jsonb) from public, anon, authenticated;
grant execute on function public.import_typical_apify(text, jsonb) to service_role;

-- Weekly job: same as before, plus Apify rows not refreshed for 60 days are dropped (stale third-party data).
create or replace function private.refresh_typical_from_history() returns void
language plpgsql security definer set search_path = public as $$
begin
  perform private.snapshot_night_attendance();

  delete from public.night_hour_stats;
  insert into public.night_hour_stats (venue_id, weekday, hour, samples, avg_declared)
  select a.venue_id,
         extract(dow from a.night_date + case when h.hour < 6 then 1 else 0 end)::smallint,
         h.hour::smallint, count(*)::int, avg(a.declared)
    from private.night_attendance a
    cross join (values (21), (22), (23), (0), (1), (2)) as h(hour)
   where a.night_date >= current_date - 56 and a.declared > 0
   group by 1, 2, 3;

  delete from public.venue_typical_busyness where source = 'history';
  insert into public.venue_typical_busyness (venue_id, weekday, hour, level, source)
  select venue_id, weekday, hour, public.level_from_avg(avg_declared), 'history'
    from public.night_hour_stats
   where samples >= 3 and avg_declared >= 3;

  delete from public.venue_typical_busyness
   where source = 'apify' and updated_at < now() - interval '60 days';
end $$;
