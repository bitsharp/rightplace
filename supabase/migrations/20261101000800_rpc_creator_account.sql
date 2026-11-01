-- 0008 — RPCs: creator events and account deletion.

create or replace function public.create_event(
  p_venue_id uuid, p_name text, p_description text, p_starts_at timestamptz, p_ends_at timestamptz,
  p_target_age_bands text[] default '{}', p_target_genders text[] default '{}'
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_id uuid;
begin
  if not (select is_creator from public.profiles where id = v_me) then
    raise exception 'NOT_CREATOR' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.venues where id = p_venue_id and is_active) then
    raise exception 'VENUE_NOT_ACTIVE' using errcode = 'P0001';
  end if;
  if p_starts_at is null or p_ends_at is null or p_ends_at <= p_starts_at or p_ends_at < now() then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  insert into public.events (creator_id, venue_id, name, description, starts_at, ends_at, target_age_bands, target_genders)
  values (v_me, p_venue_id, p_name, p_description, p_starts_at, p_ends_at,
          coalesce(p_target_age_bands, '{}'), coalesce(p_target_genders, '{}'))
  returning id into v_id;
  return v_id;
end $$;
comment on function public.create_event(uuid, text, text, timestamptz, timestamptz, text[], text[]) is
  'Privacy: creators publish events; sponsorship is set by billing only, never by this call.';

create or replace function private.event_counts(p_event_id uuid)
returns table (going int, maybe int)
language sql stable security definer set search_path = public as $$
  select count(*) filter (where intent = 'going')::int, count(*) filter (where intent = 'maybe')::int
    from public.declarations d join public.profiles p on p.id = d.user_id and p.deleted_at is null
   where d.event_id = p_event_id
$$;

create or replace function public.get_my_creator_events()
returns table (
  event_id uuid, name text, venue_name text, starts_at timestamptz, ends_at timestamptz,
  going_band text, maybe_band text, target_age_bands text[], target_genders text[], is_sponsored boolean
)
language sql stable security definer set search_path = public as $$
  select e.id, e.name, v.name, e.starts_at, e.ends_at,
         public.attendance_band(c.going), public.attendance_band(c.maybe),
         e.target_age_bands, e.target_genders, e.is_sponsored
    from public.events e
    join public.venues v on v.id = e.venue_id
    cross join lateral private.event_counts(e.id) c
   where e.creator_id = private.require_user()
   order by e.starts_at desc
$$;
comment on function public.get_my_creator_events() is
  'Privacy: creators see sign-ups to their own events as bands (k ≥ 3), never as people.';

create or replace function public.get_event_attendance(p_event_id uuid)
returns table (going_band text, maybe_band text, target_age_bands text[], target_genders text[])
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  if not exists (select 1 from public.events where id = p_event_id and creator_id = private.require_user()) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return query
  select public.attendance_band(c.going), public.attendance_band(c.maybe), e.target_age_bands, e.target_genders
    from public.events e cross join lateral private.event_counts(e.id) c
   where e.id = p_event_id;
end $$;
comment on function public.get_event_attendance(uuid) is
  'Privacy: only the event creator, and only as bands with k ≥ 3.';

-- ---------------------------------------------------------------- account deletion

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := private.require_user();
begin
  -- photos cannot be deleted with SQL on Supabase: queue them for the storage cleaner
  insert into private.storage_deletion_queue (bucket_id, object_path)
  select 'posts', photo_path from public.posts where user_id = v_me and photo_path is not null
  union all
  select 'chat-photos', photo_path from public.chat_messages where user_id = v_me and photo_path is not null;

  delete from public.posts where user_id = v_me;
  delete from public.post_comments where user_id = v_me;
  delete from public.post_likes where user_id = v_me;
  delete from public.chat_messages where user_id = v_me;
  delete from public.declarations where user_id = v_me;
  delete from public.follows where follower_id = v_me or followee_id = v_me;
  delete from public.blocks where blocker_id = v_me or blocked_id = v_me;
  delete from public.search_history where user_id = v_me;
  delete from public.push_tokens where user_id = v_me;
  delete from public.phone_hashes where user_id = v_me;
  delete from public.contact_hashes_tmp where user_id = v_me;
  delete from public.events where creator_id = v_me;

  update public.profiles
     set deleted_at = now(), birth_date = null, gender = null, city_id = null, is_creator = false,
         location_opt_in = false, contacts_opt_in = false
   where id = v_me;

  -- an Edge Function with the service role deletes auth.users (cascading the profile) within 24 h
  insert into private.account_deletion_requests (user_id) values (v_me) on conflict do nothing;
end $$;
comment on function public.delete_my_account() is
  'Privacy: erases the caller''s content, relations and personal fields at once; the auth account is removed within 24 h.';
