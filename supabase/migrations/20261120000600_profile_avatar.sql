-- 0032 — Profile photo (optional) and the Instagram-style profile: counters and the post grid.
-- Principle 1 (updated 20/11/2026): the photo is visible only to its owner and to accepted followers, never in
-- searches or to strangers (they see the initial), and a block always hides it. Principle 5: the grid shows only
-- active posts (7 days). Principle 6: counters and posts only for me and for accepted followers.

-- ---------------------------------------------------------------- storage

-- Private bucket: uploads only under the caller's own prefix `<user_id>/…`, no read policy. The photo is served
-- only through the avatar-urls Edge Function, which signs what get_avatar_paths says the caller may see.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', false, 2097152, array['image/jpeg'])
on conflict (id) do update set public = false, file_size_limit = 2097152, allowed_mime_types = array['image/jpeg'];

create policy "own prefix upload avatars" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own prefix delete avatars" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------------------------------------------------------------- column

-- The own row is readable through profiles_own_read; other people's rows never are (public_profiles has no photo).
-- Writes only through set_avatar / clear_avatar: the update grant of profiles does not include this column.
alter table public.profiles add column avatar_path text;

-- ---------------------------------------------------------------- who may see a photo

create or replace function private.can_see_avatar(p_viewer uuid, p_owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles o where o.id = p_owner and o.deleted_at is null)
     and (p_viewer = p_owner
          or (private.is_following(p_viewer, p_owner) and not private.is_blocked_pair(p_viewer, p_owner)))
$$;
revoke all on function private.can_see_avatar(uuid, uuid) from public, anon, authenticated;

create or replace function public.get_avatar_paths(p_user_ids uuid[])
returns table (user_id uuid, avatar_path text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_me uuid := private.require_user();
begin
  if coalesce(array_length(p_user_ids, 1), 0) > 100 then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  return query
  select p.id, p.avatar_path from public.profiles p
   where p.id = any (p_user_ids) and p.avatar_path is not null and private.can_see_avatar(v_me, p.id);
end $$;
comment on function public.get_avatar_paths(uuid[]) is
  'Privacy: storage paths only of the caller''s own photo and of people the caller follows with an accepted follow, never across a block; used by the avatar-urls Edge Function, which signs them for 1 hour.';

-- ---------------------------------------------------------------- set / clear

create or replace function public.set_avatar(p_path text) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_previous text;
begin
  -- exactly <my id>/<uuid>.jpg: nobody can attach somebody else's file
  if p_path is null
     or p_path !~ ('^' || v_me::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$') then
    raise exception 'INVALID_AVATAR_PATH' using errcode = 'P0001';
  end if;
  select avatar_path into v_previous from public.profiles where id = v_me;
  if v_previous is not null and v_previous <> p_path then
    insert into private.storage_deletion_queue (bucket_id, object_path) values ('avatars', v_previous);
  end if;
  update public.profiles set avatar_path = p_path where id = v_me;
end $$;
comment on function public.set_avatar(text) is
  'Privacy: the path must be <caller id>/<uuid>.jpg; the previous file is queued for removal; visibility is decided by get_avatar_paths.';

create or replace function public.clear_avatar() returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_previous text;
begin
  select avatar_path into v_previous from public.profiles where id = v_me;
  if v_previous is not null then
    insert into private.storage_deletion_queue (bucket_id, object_path) values ('avatars', v_previous);
  end if;
  update public.profiles set avatar_path = null where id = v_me;
end $$;
comment on function public.clear_avatar() is
  'Privacy: removes the caller''s own photo and queues its file for removal.';

-- ---------------------------------------------------------------- profile header

-- Counters and posts only for me and for accepted followers (principle 6); a stranger gets the public identity and
-- nothing else. Blocked pairs and deleted profiles look like a missing user.
create or replace function public.get_profile_summary(p_user_id uuid)
returns table (
  handle text, age_band text, gender text, is_creator boolean,
  followers_count int, following_count int, posts_count int, is_me boolean, follow_state text
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_me uuid := private.require_user();
  v_full boolean;
begin
  if p_user_id is null then
    return;
  end if;
  v_full := p_user_id = v_me or private.is_following(v_me, p_user_id);
  return query
  select p.handle, public.age_band(p.birth_date), p.gender, p.is_creator,
         case when v_full then (
           select count(*)::int from public.follows f
             join public.profiles o on o.id = f.follower_id and o.deleted_at is null
            where f.followee_id = p.id and f.status = 'accepted'
              and not private.is_blocked_pair(v_me, o.id) and not private.is_blocked_pair(p.id, o.id)
         ) end,
         case when v_full then (
           select count(*)::int from public.follows f
             join public.profiles o on o.id = f.followee_id and o.deleted_at is null
            where f.follower_id = p.id and f.status = 'accepted'
              and not private.is_blocked_pair(v_me, o.id) and not private.is_blocked_pair(p.id, o.id)
         ) end,
         case when v_full then (select count(*)::int from private.visible_posts() vp where vp.user_id = p.id) end,
         p.id = v_me,
         coalesce((select f.status::text from public.follows f where f.follower_id = v_me and f.followee_id = p.id), 'none')
    from public.profiles p
   where p.id = p_user_id and p.deleted_at is null
     and (p.id = v_me or not private.is_blocked_pair(v_me, p.id));
end $$;
comment on function public.get_profile_summary(uuid) is
  'Privacy: public identity (handle, age band, gender, creator flag) for anyone; follower, following and post counts only for the caller themself and accepted followers, otherwise null; blocked pairs and deleted profiles return no row.';

create or replace function public.get_user_posts(
  p_user_id uuid, p_before_visible timestamptz default null, p_before_id uuid default null, p_limit int default 30
)
returns table (
  post_id uuid, author_id uuid, author_handle text, venue_name text, night_date date, caption text, has_photo boolean,
  visible_from timestamptz, expires_at timestamptz, like_count int, comment_count int, liked_by_me boolean, is_mine boolean
)
language sql stable security definer set search_path = public as $$
  select vp.id, vp.user_id, vp.handle, vp.venue_name, vp.night_date, vp.caption, vp.photo_path is not null,
         vp.visible_from, vp.expires_at,
         (select count(*)::int from public.post_likes l where l.post_id = vp.id),
         (select count(*)::int from public.post_comments c
           where c.post_id = vp.id and not private.is_blocked_pair(private.require_user(), c.user_id)),
         exists (select 1 from public.post_likes l where l.post_id = vp.id and l.user_id = private.require_user()),
         vp.user_id = private.require_user()
    from (
      select * from private.visible_posts() v
       where v.user_id = p_user_id
         and (p_before_visible is null
              or v.visible_from < p_before_visible
              or (v.visible_from = p_before_visible and p_before_id is not null and v.id < p_before_id))
       order by v.visible_from desc, v.id desc
       limit least(greatest(coalesce(p_limit, 30), 1), 50)
    ) vp
   order by vp.visible_from desc, vp.id desc
$$;
comment on function public.get_user_posts(uuid, timestamptz, uuid, int) is
  'Privacy: the posts of one person that the caller may see (own, or accepted follow inside the window day after → +7 days, never across a block, never expired); keyset pagination on (visible_from, post_id); never returns the photo path.';

-- ---------------------------------------------------------------- account deletion

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := private.require_user();
begin
  -- photos cannot be deleted with SQL on Supabase: queue them for the storage cleaner
  insert into private.storage_deletion_queue (bucket_id, object_path)
  select 'posts', photo_path from public.posts where user_id = v_me and photo_path is not null
  union all
  select 'chat-photos', photo_path from public.chat_messages where user_id = v_me and photo_path is not null
  union all
  select 'feedback', screenshot_path from public.feedback where user_id = v_me and screenshot_path is not null
  union all
  select 'avatars', avatar_path from public.profiles where id = v_me and avatar_path is not null;

  delete from public.feedback where user_id = v_me;
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
         location_opt_in = false, contacts_opt_in = false, avatar_path = null
   where id = v_me;

  -- an Edge Function with the service role deletes auth.users (cascading the profile) within 24 h
  insert into private.account_deletion_requests (user_id) values (v_me) on conflict do nothing;
end $$;
comment on function public.delete_my_account() is
  'Privacy: erases the caller''s content, relations and personal fields at once; the auth account is removed within 24 h.';

-- ---------------------------------------------------------------- privileges

revoke all on function public.get_avatar_paths(uuid[]), public.set_avatar(text), public.clear_avatar(),
  public.get_profile_summary(uuid), public.get_user_posts(uuid, timestamptz, uuid, int) from public, anon, authenticated;
grant execute on function public.get_avatar_paths(uuid[]), public.set_avatar(text), public.clear_avatar(),
  public.get_profile_summary(uuid), public.get_user_posts(uuid, timestamptz, uuid, int) to authenticated, service_role;
