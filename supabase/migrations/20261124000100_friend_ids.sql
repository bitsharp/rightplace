-- Prompt 22, blocco 2: friends' profile photos. Wherever an RPC already lists friends by handle it now also returns
-- their user id, so the client can ask avatar-urls for the photos; who may actually see a photo is still decided
-- on the server by private.can_see_avatar (principle 1). No new rows, no ids of non-friends.
--   get_city_map: new column friends_going_ids uuid[], same order and length as friends_going (friends view only);
--   get_venue_stats / get_event_detail: friends jsonb elements gain "user_id";
--   get_my_activity: new column actor_id (the actor of rows that were already returned).

drop function public.get_city_map(text, text);
create function public.get_city_map(p_city_slug text, p_view text default 'general')
returns table (
  venue_id uuid, name text, kind text, lat double precision, lng double precision,
  typical_level smallint, going_band text, maybe_band text, is_hot_spot boolean, is_sponsored boolean,
  friends_going text[], friends_going_ids uuid[], friends_count int, is_spot boolean, is_declarable boolean
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
    select t.venue_id, array_agg(p.handle order by p.handle) as handles, array_agg(p.id order by p.handle) as ids, count(*)::int as n
      from tonight t join public.profiles p on p.id = t.user_id
     where private.is_following(v_me, t.user_id) and not private.is_blocked_pair(v_me, t.user_id)
     group by t.venue_id
  ),
  base as (
    select v.id, v.name, v.kind, st_y(v.location::geometry) as lat, st_x(v.location::geometry) as lng,
           v.kind = 'spot' as spot,
           case when v.kind = 'spot' then 0::smallint else public.typical_level(v.id, now()) end as typical,
           coalesce(c.going, 0) as going, coalesce(c.maybe, 0) as maybe,
           f.handles, f.ids, f.n, private.venue_is_sponsored(v.id) as sponsored
      from public.venues v
      left join counts c on c.venue_id = v.id
      left join friends f on f.venue_id = v.id
     where v.city_id = v_city and v.is_active
       and private.spot_is_visible(v.kind, v.hidden_at, v.spot_expires_at)
  )
  select b.id, b.name, b.kind, b.lat, b.lng, b.typical,
         -- a spot below k = 3 shows no number at all, not even "pochi": its mere existence is the signal
         case when b.spot and b.going + b.maybe < 3 then null else public.attendance_band(b.going) end,
         case when b.spot and b.going + b.maybe < 3 then null else public.attendance_band(b.maybe) end,
         (b.going + b.maybe) >= 3, b.sponsored,
         case when p_view = 'friends' then b.handles[1:5] end,
         case when p_view = 'friends' then b.ids[1:5] end,
         case when p_view = 'friends' then b.n end,
         b.spot, b.spot
    from base b
   where case
           -- below k = 3 a venue is at most a grey "typical dot" (principle 11), never a hot spot;
           -- a spot exists on the map only while someone has declared it
           when p_view = 'general' and b.spot then (b.going + b.maybe) >= 1
           when p_view = 'general' then (b.going + b.maybe) >= 3 or b.typical >= 1 or b.sponsored
           else coalesce(b.n, 0) > 0
         end;
end $$;
comment on function public.get_city_map(text, text) is
  'Privacy: turnout only as bands; venues with fewer than 3 declarations are never hot spots; a spot below 3 has NULL bands; '
  'friends view lists handles and, aligned, the user ids of accepted follows only (ids serve avatar-urls, which re-checks visibility); '
  'never returns the author of a spot (principles 1, 2, 6, 11).';
revoke all on function public.get_city_map(text, text) from public, anon;
grant execute on function public.get_city_map(text, text) to authenticated, service_role;

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
  v_kind text;
begin
  if p_segment not in ('going', 'maybe', 'all') then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  select city_id, kind into v_city, v_kind from public.venues
   where id = p_venue_id and is_active and private.spot_is_visible(kind, hidden_at, spot_expires_at);
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
  select case when v_kind = 'spot' and (select count(*) from tonight) < 3 then null
              else public.attendance_band((select count(*)::int from tonight where intent = 'going')) end,
         case when v_kind = 'spot' and (select count(*) from tonight) < 3 then null
              else public.attendance_band((select count(*)::int from tonight where intent = 'maybe')) end,
         -- k-anonymity (principle 2): no statistic about a group smaller than 3, and in "all" every
         -- non-empty sub-group must reach 3 too, otherwise "all" minus "going" would expose the rest
         case when a.k_ok then round(a.avg_age) end,
         case when a.k_ok then round(100 * a.f / a.n)::int end,
         case when a.k_ok then round(100 * a.m / a.n)::int end,
         case when a.k_ok then round(100 * a.o / a.n)::int end,
         coalesce((
           select jsonb_agg(jsonb_build_object('user_id', t.user_id, 'handle', t.handle, 'age_band', public.age_band(t.birth_date),
                                               'gender', t.gender, 'intent', t.intent) order by t.handle)
             from tonight t
            where private.is_following(v_me, t.user_id) and not private.is_blocked_pair(v_me, t.user_id)
         ), '[]'::jsonb),
         private.venue_is_sponsored(p_venue_id)
    from (select agg.*, agg.n >= 3 and agg.n_going not in (1, 2) and agg.n_maybe not in (1, 2) as k_ok from agg) a;
end $$;
comment on function public.get_venue_stats(uuid, text) is
  'Privacy: bands only (NULL for a spot below 3 people); average age and gender split are NULL when the segment (or any non-empty sub-group of "all") has fewer than 3 people; '
  'friends lists user id/handle/age band/gender/intent of accepted follows only.';

create or replace function public.get_event_detail(p_event_id uuid)
returns table (
  event_id uuid, name text, description text, starts_at timestamptz, ends_at timestamptz, cancelled_at timestamptz,
  target_age_bands text[], target_genders text[], venue_id uuid, venue_name text, venue_kind text, address text,
  lat double precision, lng double precision, city_slug text, timezone text, taxi_number text,
  going_band text, maybe_band text, avg_age numeric, female_pct int, male_pct int, other_pct int,
  friends jsonb, is_mine boolean, creator_handle text
)
language plpgsql stable security definer set search_path = public, extensions as $$
#variable_conflict use_column
declare v_me uuid := private.require_user();
begin
  if not exists (select 1 from public.events e join public.venues v on v.id = e.venue_id join public.cities c on c.id = v.city_id
                  where e.id = p_event_id and v.is_active and c.is_active) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return query
  with sign_ups as (
    select a.user_id, a.intent, p.handle, p.birth_date, p.gender
      from private.active_event_declarations(p_event_id) a join public.profiles p on p.id = a.user_id
  ),
  agg as (
    select count(*)::int as n,
           count(*) filter (where intent = 'going')::int as n_going,
           count(*) filter (where intent = 'maybe')::int as n_maybe,
           avg(extract(year from age(current_date, birth_date))) as avg_age,
           count(*) filter (where gender = 'female')::numeric as f,
           count(*) filter (where gender = 'male')::numeric as m,
           count(*) filter (where gender = 'other')::numeric as o
      from sign_ups
  ),
  stats as (
    -- same k rule as get_venue_stats
    select agg.*, agg.n >= 3 and agg.n_going not in (1, 2) and agg.n_maybe not in (1, 2) as k_ok from agg
  )
  select e.id, e.name, e.description, e.starts_at, e.ends_at, e.cancelled_at, e.target_age_bands, e.target_genders,
         v.id, v.name, v.kind, v.address, st_y(v.location::geometry), st_x(v.location::geometry),
         ci.slug, ci.timezone, ci.taxi_phone,
         public.attendance_band(s.n_going), public.attendance_band(s.n_maybe),
         case when s.k_ok then round(s.avg_age) end,
         case when s.k_ok then round(100 * s.f / s.n)::int end,
         case when s.k_ok then round(100 * s.m / s.n)::int end,
         case when s.k_ok then round(100 * s.o / s.n)::int end,
         coalesce((
           select jsonb_agg(jsonb_build_object('user_id', t.user_id, 'handle', t.handle, 'age_band', public.age_band(t.birth_date),
                                               'gender', t.gender, 'intent', t.intent) order by t.handle)
             from sign_ups t
            where private.is_following(v_me, t.user_id) and not private.is_blocked_pair(v_me, t.user_id)
         ), '[]'::jsonb),
         e.creator_id = v_me, cp.handle
    from public.events e
    join public.venues v on v.id = e.venue_id
    join public.cities ci on ci.id = v.city_id
    join public.profiles cp on cp.id = e.creator_id
    cross join stats s
   where e.id = p_event_id;
end $$;
comment on function public.get_event_detail(uuid) is
  'Privacy: bands, average age and gender split only with k ≥ 3 (same rule as get_venue_stats); friends lists accepted follows only (user id/handle/age band/gender/intent); the creator handle is public.';

drop function public.get_my_activity(timestamptz);
create or replace function public.get_my_activity(p_since timestamptz default now() - interval '7 days')
returns table (kind text, actor_handle text, post_id uuid, created_at timestamptz, actor_id uuid)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_me uuid := private.require_user();
begin
  return query
  select a.kind, a.handle, a.post_id, a.created_at, a.actor from (
    select 'like'::text as kind, p.handle, l.post_id, l.created_at, l.user_id as actor
      from public.post_likes l join public.posts po on po.id = l.post_id join public.profiles p on p.id = l.user_id
     where po.user_id = v_me and po.expires_at > now()
    union all
    select 'comment', p.handle, c.post_id, c.created_at, c.user_id
      from public.post_comments c join public.posts po on po.id = c.post_id join public.profiles p on p.id = c.user_id
     where po.user_id = v_me and po.expires_at > now()
    union all
    select 'follow_request', p.handle, null::uuid, f.created_at, f.follower_id
      from public.follows f join public.profiles p on p.id = f.follower_id
     where f.followee_id = v_me and f.status = 'pending'
    union all
    select 'follow_accepted', p.handle, null::uuid, f.responded_at, f.followee_id
      from public.follows f join public.profiles p on p.id = f.followee_id
     where f.follower_id = v_me and f.status = 'accepted' and f.responded_at is not null
  ) a
  join public.profiles ap on ap.id = a.actor and ap.deleted_at is null
  where a.actor <> v_me and a.created_at >= p_since and not private.is_blocked_pair(v_me, a.actor)
  order by a.created_at desc
  limit 50;
end $$;
comment on function public.get_my_activity(timestamptz) is
  'Privacy: likes and comments by others on the caller''s own live posts, pending requests to the caller and the caller''s accepted requests; handles and actor id only (never comment text), no blocked pairs, no deleted accounts, max 50.';
revoke all on function public.get_my_activity(timestamptz) from public, anon, authenticated;
grant execute on function public.get_my_activity(timestamptz) to authenticated, service_role;
