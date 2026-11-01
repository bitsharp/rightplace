-- 0006 — RPCs: city map, venue stats, venue search and recommendation (k-anonymity lives here).

create or replace function private.active_city(p_city_slug text) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare v_id uuid;
begin
  select id into v_id from public.cities where slug = p_city_slug and is_active;
  if v_id is null then
    raise exception 'CITY_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  return v_id;
end $$;

create or replace function private.venue_is_sponsored(p_venue_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.events e
     where e.venue_id = p_venue_id and e.is_sponsored and e.ends_at > now()
       and (e.sponsored_until is null or e.sponsored_until > now())
  )
$$;

create or replace function public.get_city_map(p_city_slug text, p_view text default 'general')
returns table (
  venue_id uuid, name text, kind text, lat double precision, lng double precision,
  typical_level smallint, going_band text, maybe_band text, is_hot_spot boolean, is_sponsored boolean,
  friends_going text[], friends_count int
)
language plpgsql stable security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare
  v_me uuid := private.require_user();
  v_city uuid;
begin
  if p_view not in ('general', 'friends') then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  v_city := private.active_city(p_city_slug);
  return query
  with tonight as (select * from private.tonight_declarations(v_city)),
  counts as (
    select t.venue_id, count(*) filter (where t.intent = 'going')::int as going,
           count(*) filter (where t.intent = 'maybe')::int as maybe
      from tonight t group by t.venue_id
  ),
  friends as (
    select t.venue_id, array_agg(p.handle order by p.handle) as handles, count(*)::int as n
      from tonight t join public.profiles p on p.id = t.user_id
     where private.is_following(v_me, t.user_id) and not private.is_blocked_pair(v_me, t.user_id)
     group by t.venue_id
  ),
  base as (
    select v.id, v.name, v.kind, st_y(v.location::geometry) as lat, st_x(v.location::geometry) as lng,
           public.typical_level(v.id, now()) as typical, coalesce(c.going, 0) as going, coalesce(c.maybe, 0) as maybe,
           f.handles, f.n, private.venue_is_sponsored(v.id) as sponsored
      from public.venues v
      left join counts c on c.venue_id = v.id
      left join friends f on f.venue_id = v.id
     where v.city_id = v_city and v.is_active
  )
  select b.id, b.name, b.kind, b.lat, b.lng, b.typical,
         public.attendance_band(b.going), public.attendance_band(b.maybe),
         (b.going + b.maybe) >= 3, b.sponsored,
         case when p_view = 'friends' then b.handles[1:5] end,
         case when p_view = 'friends' then b.n end
    from base b
   where case
           -- below k = 3 a venue is at most a grey "typical dot" (principle 11), never a hot spot
           when p_view = 'general' then (b.going + b.maybe) >= 3 or b.typical >= 1 or b.sponsored
           else coalesce(b.n, 0) > 0
         end;
end $$;
comment on function public.get_city_map(text, text) is
  'Privacy: turnout only as bands; venues with fewer than 3 declarations are never hot spots; '
  'friends view lists handles of accepted follows only (principles 2, 6, 11).';

create or replace function public.get_venue_stats(p_venue_id uuid, p_segment text default 'all')
returns table (
  going_band text, maybe_band text, avg_age numeric, female_pct int, male_pct int, other_pct int,
  friends jsonb, is_sponsored boolean
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_me uuid := private.require_user();
  v_city uuid;
begin
  if p_segment not in ('going', 'maybe', 'all') then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  select city_id into v_city from public.venues where id = p_venue_id and is_active;
  if v_city is null then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return query
  with tonight as (
    select t.user_id, t.intent, p.handle, p.birth_date, p.gender
      from private.tonight_declarations(v_city) t join public.profiles p on p.id = t.user_id
     where t.venue_id = p_venue_id
  ),
  seg as (select * from tonight where p_segment = 'all' or intent = p_segment),
  agg as (
    select count(*)::int as n,
           count(*) filter (where intent = 'going')::int as n_going,
           count(*) filter (where intent = 'maybe')::int as n_maybe,
           avg(extract(year from age(current_date, birth_date))) as avg_age,
           count(*) filter (where gender = 'female')::numeric as f,
           count(*) filter (where gender = 'male')::numeric as m,
           count(*) filter (where gender = 'other')::numeric as o
      from seg
  )
  select public.attendance_band((select count(*)::int from tonight where intent = 'going')),
         public.attendance_band((select count(*)::int from tonight where intent = 'maybe')),
         -- k-anonymity (principle 2): no statistic about a group smaller than 3, and in "all" every
         -- non-empty sub-group must reach 3 too, otherwise "all" minus "going" would expose the rest
         case when a.k_ok then round(a.avg_age) end,
         case when a.k_ok then round(100 * a.f / a.n)::int end,
         case when a.k_ok then round(100 * a.m / a.n)::int end,
         case when a.k_ok then round(100 * a.o / a.n)::int end,
         coalesce((
           select jsonb_agg(jsonb_build_object('handle', t.handle, 'age_band', public.age_band(t.birth_date),
                                               'gender', t.gender, 'intent', t.intent) order by t.handle)
             from tonight t
            where private.is_following(v_me, t.user_id) and not private.is_blocked_pair(v_me, t.user_id)
         ), '[]'::jsonb),
         private.venue_is_sponsored(p_venue_id)
    from (select agg.*, agg.n >= 3 and agg.n_going not in (1, 2) and agg.n_maybe not in (1, 2) as k_ok from agg) a;
end $$;
comment on function public.get_venue_stats(uuid, text) is
  'Privacy: bands only; average age and gender split are NULL when the segment (or any non-empty sub-group of "all") has fewer than 3 people; '
  'friends lists handle/age band/gender/intent of accepted follows only.';

create or replace function private.venue_search_rows(p_city_id uuid, p_kind text, p_query text)
returns table (venue_id uuid, name text, kind text, address text, going int, maybe int, is_sponsored boolean)
language sql stable security definer set search_path = public as $$
  select v.id, v.name, v.kind, v.address,
         count(t.user_id) filter (where t.intent = 'going')::int,
         count(t.user_id) filter (where t.intent = 'maybe')::int,
         private.venue_is_sponsored(v.id)
    from public.venues v
    left join private.tonight_declarations(p_city_id) t on t.venue_id = v.id
   where v.city_id = p_city_id and v.is_active
     and (p_kind is null or v.kind = p_kind)
     and (p_query is null or v.name ilike '%' || replace(replace(p_query, '%', '\%'), '_', '\_') || '%')
   group by v.id
$$;

create or replace function public.search_venues(p_city_slug text, p_kind text default null, p_query text default null)
returns table (venue_id uuid, name text, kind text, address text, going_band text, maybe_band text, is_sponsored boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_me uuid := private.require_user();
  v_city uuid := private.active_city(p_city_slug);
  v_query text := nullif(trim(p_query), '');
begin
  if p_kind is not null and p_kind not in ('club', 'rooftop', 'bar', 'live', 'other') then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;

  -- "Consigliata per te" remembers the top hit of real searches (max 20 rows, pruned daily)
  if v_query is not null then
    insert into public.search_history (user_id, venue_id)
    select v_me, r.venue_id from private.venue_search_rows(v_city, p_kind, v_query) r
     order by r.is_sponsored desc, (r.going + r.maybe) desc, r.name limit 1
    on conflict (user_id, venue_id) do update set searched_at = now();
  end if;

  return query
  select r.venue_id, r.name, r.kind, r.address,
         public.attendance_band(r.going), public.attendance_band(r.maybe), r.is_sponsored
    from private.venue_search_rows(v_city, p_kind, v_query) r
   order by r.is_sponsored desc, (r.going + r.maybe) desc, r.name
   limit 50;
end $$;
comment on function public.search_venues(text, text, text) is
  'Privacy: returns venues with turnout bands only; remembers the top hit in the caller''s own search history.';

create or replace function public.get_recommended_venue(p_city_slug text)
returns table (venue_id uuid, name text, kind text, reason text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_me uuid := private.require_user();
  v_city uuid := private.active_city(p_city_slug);
begin
  return query
  select v.id, v.name, v.kind, 'history'::text
    from public.search_history h join public.venues v on v.id = h.venue_id
   where h.user_id = v_me and v.city_id = v_city and v.is_active
   order by h.searched_at desc limit 1;
  if found then return; end if;

  return query
  select v.id, v.name, v.kind, 'hot'::text
    from private.tonight_declarations(v_city) t join public.venues v on v.id = t.venue_id
   where v.is_active
   group by v.id
  having count(*) >= 3
   order by count(*) desc limit 1;
end $$;
comment on function public.get_recommended_venue(text) is
  'Privacy: based only on the caller''s own search history, or on the busiest venue with at least 3 declarations.';
