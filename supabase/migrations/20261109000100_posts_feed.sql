-- 0020 — The day after (prompt 11): publishing only through create_post, a feed with a composite cursor,
-- stories, likes, comments and the file-deletion queue for post photos.
-- Principles 5 (ephemeral), 6 (only accepted follows are visible), 7 (moderation hooks).

-- ---------------------------------------------------------------- publishing only through the RPC

-- A direct insert accepted any night/event (even never declared) and any photo_path (even somebody else's file,
-- which the signing function would then have exposed). create_post checks both.
drop policy if exists posts_insert_own on public.posts;
revoke insert on public.posts from authenticated;

-- Comments get their length (300) and visibility checks from the RPC too. Likes stay on their RLS policy: it already
-- requires a post the caller can see, and the RPC adds nothing but the idempotent toggle.
drop policy if exists post_comments_insert on public.post_comments;
revoke insert on public.post_comments from authenticated;

-- ---------------------------------------------------------------- reports of comments

alter table public.reports drop constraint if exists reports_target_kind_check;
alter table public.reports add constraint reports_target_kind_check
  check (target_kind in ('post', 'message', 'user', 'event', 'comment'));

create or replace function public.report(p_target_kind text, p_target_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_target_kind not in ('post', 'message', 'user', 'event', 'comment') or p_target_id is null then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  insert into public.reports (reporter_id, target_kind, target_id, reason)
  values (private.require_user(), p_target_kind, p_target_id, left(p_reason, 500));
end $$;
comment on function public.report(text, uuid, text) is
  'Privacy: reports are readable only by moderators (service role), never by other users.';

-- ---------------------------------------------------------------- who may see which post (principle 6, in one place)

-- Mine (even before the others can see them) or those of an accepted follow inside their window, never across a
-- block, never expired, never from a deleted account. photo_path stays inside the database.
create or replace function private.visible_posts()
returns table (
  id uuid, user_id uuid, handle text, venue_name text, night_date date, caption text, photo_path text,
  visible_from timestamptz, expires_at timestamptz, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select po.id, po.user_id, pr.handle, v.name, coalesce(n.night_date, public.night_date_at(v.city_id, e.starts_at)),
         po.caption, po.photo_path, po.visible_from, po.expires_at, po.created_at
    from public.posts po
    join public.profiles pr on pr.id = po.user_id and pr.deleted_at is null
    left join public.nights n on n.id = po.night_id
    left join public.events e on e.id = po.event_id
    left join public.venues v on v.id = coalesce(n.venue_id, e.venue_id)
   where po.expires_at > now()
     and (po.user_id = private.require_user()
          or (private.is_following(private.require_user(), po.user_id)
              and now() >= po.visible_from
              and not private.is_blocked_pair(private.require_user(), po.user_id)))
$$;

-- ---------------------------------------------------------------- what I can post about

create or replace function public.get_post_target()
returns table (night_id uuid, event_id uuid, venue_name text, night_date date, room_id uuid)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_me uuid := private.require_user();
begin
  return query
  select d.night_id, d.event_id, v.name, coalesce(n.night_date, public.night_date_at(v.city_id, e.starts_at)),
         (select r.id from public.chat_rooms r
           where (r.night_id = d.night_id or r.event_id = d.event_id) and private.is_room_member(r.id, v_me)
           limit 1)
    from public.declarations d
    left join public.nights n on n.id = d.night_id
    left join public.events e on e.id = d.event_id
    join public.venues v on v.id = coalesce(n.venue_id, e.venue_id)
   where d.user_id = v_me and d.expires_at > now() - interval '24 hours'
   order by d.expires_at desc, d.created_at desc
   limit 1;
end $$;
comment on function public.get_post_target() is
  'Privacy: the caller''s own most recent declaration, active or expired for less than 24 hours (the canPost rule); room_id only while the chat is alive and the caller is a member.';

create or replace function public.create_post(p_caption text default null, p_photo_path text default null, p_chat_photo_path text default null)
returns table (post_id uuid, visible_from timestamptz, expires_at timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_me uuid := private.require_user();
  v_caption text := nullif(btrim(p_caption), '');
  v_target record;
  v_path_pattern text := '^' || v_me::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$';
  v_post_id uuid;
begin
  select * into v_target from public.get_post_target();
  if v_target.venue_name is null then
    raise exception 'NO_RECENT_DECLARATION' using errcode = 'P0001';
  end if;
  if (v_caption is null and p_photo_path is null) or char_length(coalesce(v_caption, '')) > 500
     or (p_chat_photo_path is not null and p_photo_path is null) then
    raise exception 'INVALID_POST' using errcode = 'P0001';
  end if;
  -- both paths must be exactly <my id>/<uuid>.jpg: nobody can attach somebody else's file
  if p_photo_path !~ v_path_pattern or p_chat_photo_path !~ v_path_pattern then
    raise exception 'INVALID_PHOTO_PATH' using errcode = 'P0001';
  end if;
  insert into public.posts (user_id, night_id, event_id, photo_path, caption)
  values (v_me, v_target.night_id, v_target.event_id, p_photo_path, v_caption)
  returning posts.id into v_post_id;
  -- the photo shows up in the night chat at once (a distinct file: the chat lives 2 days, the post 7)
  if p_chat_photo_path is not null and v_target.room_id is not null then
    insert into public.chat_messages (room_id, user_id, kind, photo_path)
    values (v_target.room_id, v_me, 'photo', p_chat_photo_path);
  end if;
  return query select po.id, po.visible_from, po.expires_at from public.posts po where po.id = v_post_id;
end $$;
comment on function public.create_post(text, text, text) is
  'Privacy: only about a declaration of the caller (active or expired < 24 h); files must be <caller id>/<uuid>.jpg; the window (visible from the end of the night, +7 days) comes from the posts_set_window trigger; the only write path to posts.';

-- ---------------------------------------------------------------- reading the feed

create or replace function public.get_feed(p_before_visible timestamptz default null, p_before_id uuid default null, p_limit int default 20)
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
       where p_before_visible is null
          or v.visible_from < p_before_visible
          or (v.visible_from = p_before_visible and p_before_id is not null and v.id < p_before_id)
       order by v.visible_from desc, v.id desc
       limit least(greatest(coalesce(p_limit, 20), 1), 50)
    ) vp
   order by vp.visible_from desc, vp.id desc
$$;
comment on function public.get_feed(timestamptz, uuid, int) is
  'Privacy: the caller''s posts and those of accepted follows inside their window (day after → +7 days), never across blocks; keyset pagination on (visible_from, post_id); never returns the photo path.';

create or replace function public.get_story_posts(p_user_id uuid)
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
    from private.visible_posts() vp
   where vp.user_id = p_user_id
     and greatest(vp.visible_from, case when vp.user_id = private.require_user() then vp.created_at end) > now() - interval '24 hours'
   order by vp.visible_from, vp.id
   limit 50
$$;
comment on function public.get_story_posts(uuid) is
  'Privacy: posts of one person published in the last 24 hours, only if the caller may see them (accepted follow, no block) or they are the caller''s own (which count even before the others can see them).';

-- ---------------------------------------------------------------- likes

create or replace function public.set_post_like(p_post_id uuid, p_liked boolean)
returns table (like_count int, liked_by_me boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare v_me uuid := private.require_user();
begin
  if not exists (select 1 from private.visible_posts() vp where vp.id = p_post_id) then
    raise exception 'POST_NOT_FOUND' using errcode = 'P0001';
  end if;
  if p_liked then
    insert into public.post_likes (post_id, user_id) values (p_post_id, v_me) on conflict do nothing;
  else
    delete from public.post_likes where post_id = p_post_id and user_id = v_me;
  end if;
  return query select (select count(*)::int from public.post_likes l where l.post_id = p_post_id), coalesce(p_liked, false);
end $$;
comment on function public.set_post_like(uuid, boolean) is
  'Privacy: only on posts the caller can see; idempotent; who liked stays visible only to the liker and the post author (RLS).';

-- ---------------------------------------------------------------- comments

create or replace function public.get_post_comments(p_post_id uuid, p_before timestamptz default null, p_limit int default 30)
returns table (comment_id uuid, user_id uuid, handle text, text text, created_at timestamptz, is_mine boolean, can_delete boolean)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_me uuid := private.require_user();
  v_author uuid;
begin
  select vp.user_id into v_author from private.visible_posts() vp where vp.id = p_post_id;
  if v_author is null then
    raise exception 'POST_NOT_FOUND' using errcode = 'P0001';
  end if;
  return query
  select c.id, c.user_id, pr.handle, c.text, c.created_at, c.user_id = v_me, (c.user_id = v_me or v_author = v_me)
    from public.post_comments c join public.profiles pr on pr.id = c.user_id
   where c.post_id = p_post_id and not private.is_blocked_pair(v_me, c.user_id)
     and (p_before is null or c.created_at < p_before)
   order by c.created_at desc, c.id desc
   limit least(greatest(coalesce(p_limit, 30), 1), 100);
end $$;
comment on function public.get_post_comments(uuid, timestamptz, int) is
  'Privacy: only for posts the caller can see; comments of people blocked in either direction are left out.';

create or replace function public.add_post_comment(p_post_id uuid, p_text text)
returns table (comment_id uuid, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_me uuid := private.require_user();
  v_text text := nullif(btrim(p_text), '');
begin
  if not exists (select 1 from private.visible_posts() vp where vp.id = p_post_id) then
    raise exception 'POST_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_text is null or char_length(v_text) > 300 then
    raise exception 'INVALID_COMMENT' using errcode = 'P0001';
  end if;
  return query
  insert into public.post_comments (post_id, user_id, text) values (p_post_id, v_me, v_text)
  returning post_comments.id, post_comments.created_at;
end $$;
comment on function public.add_post_comment(uuid, text) is
  'Privacy: only on posts the caller can see; text 1-300 characters; the only write path to post_comments.';

create or replace function public.delete_post_comment(p_comment_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_deleted int;
begin
  delete from public.post_comments c
   where c.id = p_comment_id
     and (c.user_id = v_me or exists (select 1 from public.posts po where po.id = c.post_id and po.user_id = v_me));
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
end $$;
comment on function public.delete_post_comment(uuid) is
  'Privacy: only the author of the comment or of the post can delete it; anything else looks like a missing comment.';

create or replace function public.delete_post(p_post_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_deleted int;
begin
  delete from public.posts where id = p_post_id and user_id = private.require_user();
  get diagnostics v_deleted = row_count;
  if v_deleted = 0 then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
end $$;
comment on function public.delete_post(uuid) is
  'Privacy: only the author deletes a post; likes and comments go with it and its file is queued for removal.';

-- ---------------------------------------------------------------- signed URLs and file deletion

create or replace function public.get_post_photo_paths(p_post_ids uuid[])
returns table (post_id uuid, photo_path text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
begin
  perform private.require_user();
  if coalesce(array_length(p_post_ids, 1), 0) > 100 then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  return query
  select vp.id, vp.photo_path from private.visible_posts() vp
   where vp.id = any (p_post_ids) and vp.photo_path is not null;
end $$;
comment on function public.get_post_photo_paths(uuid[]) is
  'Privacy: storage paths only for posts the caller can see; used by the post-photo-urls Edge Function, which signs them for 1 hour.';

-- Every way a post dies (own delete, expiry job, account deletion) queues its file. Duplicates with
-- purge_expired_content are harmless: removing a missing object is a no-op.
create or replace function private.queue_post_photo_deletion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.photo_path is not null then
    insert into private.storage_deletion_queue (bucket_id, object_path) values ('posts', old.photo_path);
  end if;
  return old;
end $$;
create trigger posts_queue_photo after delete on public.posts
  for each row execute function private.queue_post_photo_deletion();

-- ---------------------------------------------------------------- privileges

drop function if exists public.get_feed(timestamptz, int);

revoke all on function public.get_post_target(), public.create_post(text, text, text),
  public.get_feed(timestamptz, uuid, int), public.get_story_posts(uuid), public.set_post_like(uuid, boolean),
  public.get_post_comments(uuid, timestamptz, int), public.add_post_comment(uuid, text),
  public.delete_post_comment(uuid), public.delete_post(uuid), public.get_post_photo_paths(uuid[]),
  public.report(text, uuid, text) from public, anon, authenticated;
grant execute on function public.get_post_target(), public.create_post(text, text, text),
  public.get_feed(timestamptz, uuid, int), public.get_story_posts(uuid), public.set_post_like(uuid, boolean),
  public.get_post_comments(uuid, timestamptz, int), public.add_post_comment(uuid, text),
  public.delete_post_comment(uuid), public.delete_post(uuid), public.get_post_photo_paths(uuid[]),
  public.report(text, uuid, text) to authenticated, service_role;
revoke all on function private.visible_posts(), private.queue_post_photo_deletion() from public, anon, authenticated;
