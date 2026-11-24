-- Novità del cuore -> post, like e commento. Una notizia "X ha messo like / ha commentato" ora porta al post:
--   get_my_activity: nuova colonna comment_id (solo sulle righe di tipo commento), per evidenziare il commento;
--   get_post: UN post visibile al chiamante (private.visible_posts), stesse colonne di get_feed;
--   get_post_likers: chi ha messo like, solo per l'autore del post (sono persone che il post lo vedono già).
-- Nessuna nuova riga e nessuna nuova visibilità: le regole di get_my_activity restano identiche (principi 1, 5, 6).

drop function public.get_my_activity(timestamptz);
create function public.get_my_activity(p_since timestamptz default now() - interval '7 days')
returns table (kind text, actor_handle text, post_id uuid, created_at timestamptz, actor_id uuid, comment_id uuid)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_me uuid := private.require_user();
begin
  return query
  select a.kind, a.handle, a.post_id, a.created_at, a.actor, a.comment_id from (
    select 'like'::text as kind, p.handle, l.post_id, l.created_at, l.user_id as actor, null::uuid as comment_id
      from public.post_likes l join public.posts po on po.id = l.post_id join public.profiles p on p.id = l.user_id
     where po.user_id = v_me and po.expires_at > now()
    union all
    select 'comment', p.handle, c.post_id, c.created_at, c.user_id, c.id
      from public.post_comments c join public.posts po on po.id = c.post_id join public.profiles p on p.id = c.user_id
     where po.user_id = v_me and po.expires_at > now()
    union all
    select 'follow_request', p.handle, null::uuid, f.created_at, f.follower_id, null::uuid
      from public.follows f join public.profiles p on p.id = f.follower_id
     where f.followee_id = v_me and f.status = 'pending'
    union all
    select 'follow_accepted', p.handle, null::uuid, f.responded_at, f.followee_id, null::uuid
      from public.follows f join public.profiles p on p.id = f.followee_id
     where f.follower_id = v_me and f.status = 'accepted' and f.responded_at is not null
  ) a
  join public.profiles ap on ap.id = a.actor and ap.deleted_at is null
  where a.actor <> v_me and a.created_at >= p_since and not private.is_blocked_pair(v_me, a.actor)
  order by a.created_at desc
  limit 50;
end $$;
comment on function public.get_my_activity(timestamptz) is
  'Privacy: likes and comments by others on the caller''s own live posts, pending requests to the caller and the caller''s accepted requests; handles, actor id and comment id only (never comment text), no blocked pairs, no deleted accounts, max 50.';
revoke all on function public.get_my_activity(timestamptz) from public, anon, authenticated;
grant execute on function public.get_my_activity(timestamptz) to authenticated, service_role;

create function public.get_post(p_post_id uuid)
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
   where vp.id = p_post_id
$$;
comment on function public.get_post(uuid) is
  'Privacy: one post, only if the caller may see it (their own, or an accepted follow inside its window, no block, not expired); otherwise no rows, so existence is not revealed; same columns as get_feed, never the photo path.';
revoke all on function public.get_post(uuid) from public, anon;
grant execute on function public.get_post(uuid) to authenticated, service_role;

create function public.get_post_likers(p_post_id uuid, p_limit int default 100)
returns table (user_id uuid, handle text, liked_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_me uuid := private.require_user();
begin
  -- a non-author gets the same answer as for a post that does not exist
  if not exists (select 1 from public.posts po where po.id = p_post_id and po.user_id = v_me and po.expires_at > now()) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  return query
  select l.user_id, p.handle, l.created_at
    from public.post_likes l join public.profiles p on p.id = l.user_id and p.deleted_at is null
   where l.post_id = p_post_id and not private.is_blocked_pair(v_me, l.user_id)
   order by l.created_at, l.user_id
   limit least(greatest(coalesce(p_limit, 100), 1), 200);
end $$;
comment on function public.get_post_likers(uuid, int) is
  'Privacy: only the author sees who liked their post (they are people who can already see it); NOT_FOUND for anyone else, for expired or missing posts; no blocked pairs, no deleted accounts, max 200.';
revoke all on function public.get_post_likers(uuid, int) from public, anon;
grant execute on function public.get_post_likers(uuid, int) to authenticated, service_role;
