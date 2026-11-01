-- 0007 — RPCs: people search, follow with acceptance, contacts, feed, stories, blocks, reports.

create or replace function public.search_users(p_query text)
returns table (
  user_id uuid, handle text, age_band text, gender text, is_creator boolean,
  follow_state text, follows_me boolean, tonight_venue_id uuid, tonight_venue_name text
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_me uuid := private.require_user();
  v_query text := lower(trim(leading '@' from trim(coalesce(p_query, ''))));
begin
  if char_length(v_query) < 2 then
    return;
  end if;
  return query
  select p.id, p.handle, public.age_band(p.birth_date), p.gender, p.is_creator,
         coalesce(f.status, 'none'),
         private.is_following(p.id, v_me),
         tv.venue_id, tv.venue_name
    from public.profiles p
    left join public.follows f on f.follower_id = v_me and f.followee_id = p.id
    -- where they go tonight is visible only through an accepted follow (principle 6)
    left join lateral private.user_tonight_venue(p.id) tv on f.status = 'accepted'
   where p.id <> v_me and p.deleted_at is null
     and p.handle like '%' || replace(replace(v_query, '%', '\%'), '_', '\_') || '%'
     and not private.is_blocked_pair(v_me, p.id)
   order by (p.handle like v_query || '%') desc, p.handle
   limit 20;
end $$;
comment on function public.search_users(text) is
  'Privacy: strangers expose only handle, age band, gender, creator flag; tonight''s venue only with an accepted follow; '
  'blocked users are excluded both ways.';

-- ---------------------------------------------------------------- follow lifecycle

create or replace function public.request_follow(p_user_id uuid) returns text
language plpgsql security definer set search_path = public as $$
declare v_me uuid := private.require_user();
begin
  if p_user_id = v_me then
    raise exception 'CANNOT_FOLLOW_SELF' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id and deleted_at is null) then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
  if private.is_blocked_pair(v_me, p_user_id) then
    raise exception 'BLOCKED' using errcode = 'P0001';
  end if;
  insert into public.follows (follower_id, followee_id) values (v_me, p_user_id) on conflict do nothing;
  return (select status from public.follows where follower_id = v_me and followee_id = p_user_id);
end $$;
comment on function public.request_follow(uuid) is
  'Privacy: creates a pending request that unlocks nothing until the other user accepts.';

create or replace function public.cancel_follow_request(p_user_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.follows
   where follower_id = private.require_user() and followee_id = p_user_id and status = 'pending'
$$;
comment on function public.cancel_follow_request(uuid) is 'Privacy: withdraws the caller''s own pending request.';

create or replace function public.accept_follow(p_follower_id uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  update public.follows set status = 'accepted'
   where follower_id = p_follower_id and followee_id = private.require_user() and status = 'pending';
  if not found then
    raise exception 'NOT_FOUND' using errcode = 'P0001';
  end if;
end $$;
comment on function public.accept_follow(uuid) is
  'Privacy: only the followee can accept; from now on the follower sees the caller''s plans, posts and chat presence.';

create or replace function public.decline_follow(p_follower_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.follows
   where follower_id = p_follower_id and followee_id = private.require_user() and status = 'pending'
$$;
comment on function public.decline_follow(uuid) is 'Privacy: the requester is not notified of the refusal.';

create or replace function public.unfollow(p_user_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.follows where follower_id = private.require_user() and followee_id = p_user_id
$$;
comment on function public.unfollow(uuid) is 'Privacy: stops the caller following a user; nothing is shared any more.';

create or replace function public.remove_follower(p_follower_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.follows where follower_id = p_follower_id and followee_id = private.require_user()
$$;
comment on function public.remove_follower(uuid) is
  'Privacy: visibility for the removed follower drops immediately; they are not notified.';

create or replace function public.get_follow_requests()
returns table (user_id uuid, handle text, age_band text, gender text, is_creator boolean, requested_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.handle, public.age_band(p.birth_date), p.gender, p.is_creator, f.created_at
    from public.follows f join public.profiles p on p.id = f.follower_id
   where f.followee_id = private.require_user() and f.status = 'pending' and p.deleted_at is null
     and not private.is_blocked_pair(f.followee_id, f.follower_id)
   order by f.created_at desc
$$;
comment on function public.get_follow_requests() is 'Privacy: public identity of requesters only.';

create or replace function public.count_follow_requests() returns int
language sql stable security definer set search_path = public as $$
  select count(*)::int from public.get_follow_requests()
$$;
comment on function public.count_follow_requests() is 'Privacy: a count of the caller''s own pending requests.';

-- ---------------------------------------------------------------- contacts (principle 4)

create or replace function private.assert_hash(p_hash text) returns void
language plpgsql immutable as $$
begin
  if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'INVALID_HASH' using errcode = 'P0001';
  end if;
end $$;

create or replace function public.match_contacts(p_hashes text[])
returns table (user_id uuid, handle text, age_band text, gender text, is_creator boolean)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_me uuid := private.require_user();
  v_hash text;
begin
  if not (select contacts_opt_in from public.profiles where id = v_me) then
    raise exception 'CONTACTS_OPT_OUT' using errcode = 'P0001';
  end if;
  if coalesce(array_length(p_hashes, 1), 0) > 2000 then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  foreach v_hash in array coalesce(p_hashes, '{}') loop
    perform private.assert_hash(v_hash);
  end loop;

  insert into public.contact_hashes_tmp (user_id, hash)
  select v_me, unnest(p_hashes) on conflict do nothing;

  return query
  select p.id, p.handle, public.age_band(p.birth_date), p.gender, p.is_creator
    from public.contact_hashes_tmp t
    join public.phone_hashes ph on ph.hash = t.hash
    join public.profiles p on p.id = ph.user_id
   where t.user_id = v_me and p.id <> v_me and p.deleted_at is null
     and not exists (select 1 from public.follows f where f.follower_id = v_me and f.followee_id = p.id)
     and not private.is_blocked_pair(v_me, p.id)
   order by p.handle;

  -- hashes are not kept after matching
  delete from public.contact_hashes_tmp where user_id = v_me;
end $$;
comment on function public.match_contacts(text[]) is
  'Privacy: accepts only SHA-256 hashes (never numbers or names), returns public profiles not yet followed, '
  'and deletes the submitted hashes before returning.';

create or replace function public.set_my_phone_hash(p_hash text) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := private.require_user();
begin
  perform private.assert_hash(p_hash);
  insert into public.phone_hashes (user_id, hash) values (v_me, p_hash)
  on conflict (user_id) do update set hash = excluded.hash;
end $$;
comment on function public.set_my_phone_hash(text) is
  'Privacy: stores only the hash of the caller''s own number so friends can find them; never readable by clients.';

create or replace function public.clear_my_phone_hash() returns void
language sql security definer set search_path = public as $$
  delete from public.phone_hashes where user_id = private.require_user()
$$;
comment on function public.clear_my_phone_hash() is 'Privacy: deletes the caller''s phone hash.';

-- ---------------------------------------------------------------- feed and stories (principles 5, 6)

create or replace function public.get_feed(p_before timestamptz default null, p_limit int default 20)
returns table (
  post_id uuid, author_id uuid, author_handle text, venue_name text, caption text, photo_path text,
  visible_from timestamptz, expires_at timestamptz, like_count int, comment_count int, liked_by_me boolean
)
language sql stable security definer set search_path = public as $$
  with me as (select private.require_user() as id)
  select po.id, po.user_id, pr.handle, v.name, po.caption, po.photo_path, po.visible_from, po.expires_at,
         (select count(*)::int from public.post_likes l where l.post_id = po.id),
         (select count(*)::int from public.post_comments c where c.post_id = po.id
            and not private.is_blocked_pair((select id from me), c.user_id)),
         exists (select 1 from public.post_likes l where l.post_id = po.id and l.user_id = (select id from me))
    from public.posts po
    join public.profiles pr on pr.id = po.user_id and pr.deleted_at is null
    left join public.nights n on n.id = po.night_id
    left join public.events e on e.id = po.event_id
    left join public.venues v on v.id = coalesce(n.venue_id, e.venue_id)
   where po.expires_at > now()
     and (po.user_id = (select id from me)
          or (private.is_following((select id from me), po.user_id)
              and now() >= po.visible_from
              and not private.is_blocked_pair((select id from me), po.user_id)))
     and (p_before is null or po.visible_from < p_before)
   order by po.visible_from desc, po.id
   limit least(greatest(coalesce(p_limit, 20), 1), 50)
$$;
comment on function public.get_feed(timestamptz, int) is
  'Privacy: posts of accepted follows only, inside their visibility window (day after → +7 days), never across blocks.';

create or replace function public.get_stories()
returns table (user_id uuid, handle text, latest_post_at timestamptz)
language sql stable security definer set search_path = public as $$
  select pr.id, pr.handle, max(po.visible_from)
    from public.posts po join public.profiles pr on pr.id = po.user_id and pr.deleted_at is null
   where private.is_following(private.require_user(), po.user_id)
     and not private.is_blocked_pair(private.require_user(), po.user_id)
     and now() >= po.visible_from and now() < po.expires_at
     and po.visible_from > now() - interval '24 hours'
   group by pr.id, pr.handle
   order by max(po.visible_from) desc
$$;
comment on function public.get_stories() is 'Privacy: accepted follows with a post published in the last 24 hours.';

-- ---------------------------------------------------------------- moderation (principle 7)

create or replace function public.report(p_target_kind text, p_target_id uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_target_kind not in ('post', 'message', 'user', 'event') or p_target_id is null then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  insert into public.reports (reporter_id, target_kind, target_id, reason)
  values (private.require_user(), p_target_kind, p_target_id, left(p_reason, 500));
end $$;
comment on function public.report(text, uuid, text) is
  'Privacy: reports are readable only by moderators (service role), never by other users.';

create or replace function public.block_user(p_user_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_me uuid := private.require_user();
begin
  if p_user_id = v_me then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  insert into public.blocks (blocker_id, blocked_id) values (v_me, p_user_id) on conflict do nothing;
  delete from public.follows
   where (follower_id = v_me and followee_id = p_user_id) or (follower_id = p_user_id and followee_id = v_me);
end $$;
comment on function public.block_user(uuid) is
  'Privacy: removes follows in both directions and hides each user from the other everywhere.';

create or replace function public.unblock_user(p_user_id uuid) returns void
language sql security definer set search_path = public as $$
  delete from public.blocks where blocker_id = private.require_user() and blocked_id = p_user_id
$$;
comment on function public.unblock_user(uuid) is 'Privacy: lifts the caller''s own block; follows are not restored.';
