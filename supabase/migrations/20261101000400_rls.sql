-- 0004 — Row Level Security on every table, column privileges and the two public views.
-- Rule of thumb: clients read their own rows; anything about other people goes through
-- security definer RPCs that apply k-anonymity and accepted-follow checks.

-- ---------------------------------------------------------------- helpers usable inside policies

create or replace function private.is_following(p_follower uuid, p_followee uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.follows
     where follower_id = p_follower and followee_id = p_followee and status = 'accepted'
  )
$$;

-- A user belongs to a night chat while holding an active declaration on that night/event.
create or replace function private.is_room_member(p_room_id uuid, p_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.chat_rooms r
      join public.declarations d
        on (d.night_id = r.night_id or d.event_id = r.event_id)
     where r.id = p_room_id and d.user_id = p_user_id and d.expires_at > now() and r.expires_at > now()
  )
$$;

-- Principle 6: visible to the author, or to accepted followers inside the window, never across a block.
create or replace function private.can_see_post(p_author uuid, p_visible_from timestamptz, p_expires_at timestamptz)
returns boolean language sql stable security definer set search_path = public as $$
  select p_author = auth.uid()
      or (private.is_following(auth.uid(), p_author)
          and now() >= p_visible_from and now() < p_expires_at
          and not private.is_blocked_pair(auth.uid(), p_author))
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_blocked_pair(uuid, uuid), private.is_following(uuid, uuid),
  private.is_room_member(uuid, uuid), private.can_see_post(uuid, timestamptz, timestamptz) to authenticated;

-- ---------------------------------------------------------------- RLS on

alter table public.cities enable row level security;
alter table public.venues enable row level security;
alter table public.profiles enable row level security;
alter table public.follows enable row level security;
alter table public.blocks enable row level security;
alter table public.venue_typical_busyness enable row level security;
alter table public.night_hour_stats enable row level security;
alter table public.events enable row level security;
alter table public.nights enable row level security;
alter table public.declarations enable row level security;
alter table public.chat_rooms enable row level security;
alter table public.chat_messages enable row level security;
alter table public.posts enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.search_history enable row level security;
alter table public.contact_hashes_tmp enable row level security;
alter table public.phone_hashes enable row level security;
alter table public.reports enable row level security;
alter table public.subscriptions enable row level security;
alter table public.push_tokens enable row level security;

-- Anonymous visitors (before sign-in) never read app data.
revoke all on all tables in schema public from anon;

-- ---------------------------------------------------------------- catalog: readable by signed-in users

create policy cities_read on public.cities for select to authenticated using (true);
create policy venues_read on public.venues for select to authenticated using (true);
create policy nights_read on public.nights for select to authenticated using (true);
create policy typical_read on public.venue_typical_busyness for select to authenticated using (true);
revoke insert, update, delete on public.cities, public.venues, public.nights, public.venue_typical_busyness,
  public.night_hour_stats from authenticated;
-- night_hour_stats: RLS on and no policy → service role only.

-- ---------------------------------------------------------------- profiles

create policy profiles_own_read on public.profiles for select to authenticated using (id = auth.uid());
create policy profiles_own_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
-- Only harmless switches are writable directly; age, gender, creator flag and position go through RPCs.
revoke insert, update, delete on public.profiles from authenticated;
grant update (locale, location_opt_in, contacts_opt_in) on public.profiles to authenticated;

-- The ONLY way to read other people's profiles (principle 1).
create view public.public_profiles as
  select p.id, p.handle, public.age_band(p.birth_date) as age_band, p.gender, p.is_creator
    from public.profiles p
   where p.deleted_at is null
     and not private.is_blocked_pair(auth.uid(), p.id);
comment on view public.public_profiles is 'Public identity only: handle, age band, gender, creator flag.';
revoke all on public.public_profiles from anon;
grant select on public.public_profiles to authenticated;

-- ---------------------------------------------------------------- follows and blocks

create policy follows_read_own on public.follows for select to authenticated
  using (follower_id = auth.uid() or followee_id = auth.uid());
create policy follows_request on public.follows for insert to authenticated
  with check (follower_id = auth.uid() and status = 'pending');
create policy follows_accept on public.follows for update to authenticated
  using (followee_id = auth.uid()) with check (followee_id = auth.uid() and status = 'accepted');
create policy follows_delete on public.follows for delete to authenticated
  using (follower_id = auth.uid() or followee_id = auth.uid());
revoke update on public.follows from authenticated;
grant update (status) on public.follows to authenticated;

create view public.accepted_follows with (security_invoker = true) as
  select follower_id, followee_id, responded_at from public.follows where status = 'accepted';
revoke all on public.accepted_follows from anon;
grant select on public.accepted_follows to authenticated;

create policy blocks_own on public.blocks for select to authenticated using (blocker_id = auth.uid());
create policy blocks_insert on public.blocks for insert to authenticated with check (blocker_id = auth.uid());
create policy blocks_delete on public.blocks for delete to authenticated using (blocker_id = auth.uid());
revoke update on public.blocks from authenticated;

-- ---------------------------------------------------------------- events

create policy events_read on public.events for select to authenticated using (true);
create policy events_insert on public.events for insert to authenticated
  with check (creator_id = auth.uid()
    and exists (select 1 from public.profiles where id = auth.uid() and is_creator and deleted_at is null));
create policy events_update on public.events for update to authenticated
  using (creator_id = auth.uid()) with check (creator_id = auth.uid());
create policy events_delete on public.events for delete to authenticated using (creator_id = auth.uid());
-- Sponsorship is set only by billing (prompt 13), never by the client.
revoke insert, update on public.events from authenticated;
grant insert (creator_id, venue_id, name, description, starts_at, ends_at, target_age_bands, target_genders)
  on public.events to authenticated;
grant update (name, description, starts_at, ends_at, target_age_bands, target_genders) on public.events to authenticated;

-- ---------------------------------------------------------------- declarations (own rows; writes via RPC)

create policy declarations_own_read on public.declarations for select to authenticated using (user_id = auth.uid());
create policy declarations_own_delete on public.declarations for delete to authenticated using (user_id = auth.uid());
revoke insert, update on public.declarations from authenticated;

-- ---------------------------------------------------------------- chat

create policy chat_rooms_members on public.chat_rooms for select to authenticated
  using (private.is_room_member(id, auth.uid()));
revoke insert, update, delete on public.chat_rooms from authenticated;

-- Principle 6: inside a night chat you read your own messages and those of people you follow (accepted).
create policy chat_messages_read on public.chat_messages for select to authenticated
  using (private.is_room_member(room_id, auth.uid())
         and (user_id = auth.uid() or private.is_following(auth.uid(), user_id))
         and not private.is_blocked_pair(auth.uid(), user_id));
create policy chat_messages_insert on public.chat_messages for insert to authenticated
  with check (user_id = auth.uid() and private.is_room_member(room_id, auth.uid()));
create policy chat_messages_delete_own on public.chat_messages for delete to authenticated using (user_id = auth.uid());
revoke insert, update on public.chat_messages from authenticated;
grant insert (room_id, user_id, kind, text, photo_path) on public.chat_messages to authenticated;

-- ---------------------------------------------------------------- posts, likes, comments

create policy posts_read on public.posts for select to authenticated
  using (private.can_see_post(user_id, visible_from, expires_at));
create policy posts_insert_own on public.posts for insert to authenticated with check (user_id = auth.uid());
create policy posts_delete_own on public.posts for delete to authenticated using (user_id = auth.uid());
revoke insert, update on public.posts from authenticated;
grant insert (user_id, night_id, event_id, photo_path, caption) on public.posts to authenticated;

-- Likes/comments can only be added to posts the caller can see (the subquery runs under the caller's RLS).
-- Who liked a post is visible only to the liker and the author: listing likers would reveal who follows whom.
create policy post_likes_read on public.post_likes for select to authenticated
  using (user_id = auth.uid() or exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));
create policy post_likes_insert on public.post_likes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id));
create policy post_likes_delete on public.post_likes for delete to authenticated using (user_id = auth.uid());
revoke update on public.post_likes from authenticated;

create policy post_comments_read on public.post_comments for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id) and not private.is_blocked_pair(auth.uid(), user_id));
create policy post_comments_insert on public.post_comments for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id));
create policy post_comments_delete on public.post_comments for delete to authenticated using (user_id = auth.uid());
revoke update on public.post_comments from authenticated;

-- ---------------------------------------------------------------- own-only tables

create policy search_history_own on public.search_history for select to authenticated using (user_id = auth.uid());
create policy search_history_delete on public.search_history for delete to authenticated using (user_id = auth.uid());
revoke insert, update on public.search_history from authenticated;

create policy push_tokens_own on public.push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy subscriptions_own on public.subscriptions for select to authenticated using (user_id = auth.uid());
revoke insert, update, delete on public.subscriptions from authenticated;

create policy reports_insert on public.reports for insert to authenticated with check (reporter_id = auth.uid());
revoke select, update, delete on public.reports from authenticated;

-- Hashes are never readable by clients, not even their own (principle 4): RPC only.
revoke all on public.contact_hashes_tmp, public.phone_hashes from authenticated;
