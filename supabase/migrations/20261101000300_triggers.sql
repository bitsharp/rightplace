-- 0003 — Triggers: profile on sign-up, expiry of declarations/rooms/posts, follow rules.

-- Every auth user gets a profile with a generated handle; the rest is filled by complete_profile.
create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, handle) values (new.id, public.generate_handle());
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.profiles_before_write() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.handle is null then
    new.handle := public.generate_handle();
  end if;
  -- principle 3: turning location off wipes the stored position immediately
  if not new.location_opt_in then
    new.coarse_location := null;
    new.coarse_location_at := null;
  end if;
  return new;
end $$;

create trigger profiles_before_write before insert or update on public.profiles
  for each row execute function private.profiles_before_write();

-- ---------------------------------------------------------------- expiry

-- End of the night a declaration/post refers to: 06:00 after a night, or the event end.
create or replace function private.target_end(p_night_id uuid, p_event_id uuid) returns timestamptz
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select public.night_end(n.night_date, c.timezone)
       from public.nights n join public.venues v on v.id = n.venue_id join public.cities c on c.id = v.city_id
      where n.id = p_night_id),
    (select e.ends_at from public.events e where e.id = p_event_id)
  )
$$;

create or replace function private.declarations_set_expiry() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.night_id is distinct from old.night_id or new.event_id is distinct from old.event_id then
    new.expires_at := private.target_end(new.night_id, new.event_id);
  end if;
  return new;
end $$;

create trigger declarations_set_expiry before insert or update on public.declarations
  for each row execute function private.declarations_set_expiry();

-- Principle 5: the night chat exists from the first declaration and dies 2 days after the night.
create or replace function private.declarations_ensure_room() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.chat_rooms (night_id, event_id, expires_at)
  values (new.night_id, new.event_id, new.expires_at + interval '2 days')
  on conflict do nothing;
  return new;
end $$;

create trigger declarations_ensure_room after insert on public.declarations
  for each row execute function private.declarations_ensure_room();

-- Posts appear in the feed the day after (06:00 after the night) and expire 7 days later.
create or replace function private.posts_set_window() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_event_night_end timestamptz;
begin
  if new.event_id is not null then
    select public.night_end(public.night_date_at(v.city_id, e.starts_at), c.timezone) into v_event_night_end
      from public.events e join public.venues v on v.id = e.venue_id join public.cities c on c.id = v.city_id
     where e.id = new.event_id;
  end if;
  new.visible_from := coalesce(v_event_night_end, private.target_end(new.night_id, null), now());
  new.expires_at := new.visible_from + interval '7 days';
  return new;
end $$;

create trigger posts_set_window before insert on public.posts
  for each row execute function private.posts_set_window();

-- ---------------------------------------------------------------- follows (principle 6)

create or replace function private.is_blocked_pair(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
     where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  )
$$;

create or replace function private.follows_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status <> 'pending' then
    raise exception 'FOLLOW_MUST_START_PENDING' using errcode = 'P0001';
  end if;
  if private.is_blocked_pair(new.follower_id, new.followee_id) then
    raise exception 'BLOCKED' using errcode = 'P0001';
  end if;
  new.created_at := now();
  new.responded_at := null;
  return new;
end $$;

create trigger follows_before_insert before insert on public.follows
  for each row execute function private.follows_before_insert();

create or replace function private.follows_before_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.follower_id <> old.follower_id or new.followee_id <> old.followee_id then
    raise exception 'FOLLOW_IMMUTABLE' using errcode = 'P0001';
  end if;
  if not (old.status = 'pending' and new.status = 'accepted') then
    raise exception 'FOLLOW_INVALID_TRANSITION' using errcode = 'P0001';
  end if;
  new.responded_at := now();
  return new;
end $$;

create trigger follows_before_update before update on public.follows
  for each row execute function private.follows_before_update();
