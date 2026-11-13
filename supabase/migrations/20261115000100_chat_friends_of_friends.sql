-- 0020 — Night chat visible to friends of friends in the same room (prompt 19).
-- Principle 6, chat exception: in a room I see me, anyone linked to me, and anyone linked to a friend of mine who is
-- declared in the SAME room. The block always wins. The rule lives in ONE function; every reader calls it.

-- ---------------------------------------------------------------- the rule

-- linked is symmetric on purpose: someone who follows me and whom I accepted already gave me their trust, and in the chat
-- of a night we both attend the relation is de facto mutual. Accepted follows only; a block cuts the link.
create or replace function private.is_linked(p_a uuid, p_b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (private.is_following(p_a, p_b) or private.is_following(p_b, p_a))
     and not private.is_blocked_pair(p_a, p_b)
$$;
comment on function private.is_linked(uuid, uuid) is
  'Privacy: true only with an accepted follow in either direction and no block between the two users.';

-- Why Y must be declared in the same room: "a friend in common at the party" is the social reason to see a stranger there.
-- Without it the visible circle would grow to the whole two-hop network and principle 6 would be hollow.
-- Candidates for Y come from MY accepted follows (either direction), so the search is bounded by my own circle.
create or replace function private.can_see_chat_author_for(p_viewer uuid, p_room_id uuid, p_author uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not private.is_blocked_pair(p_viewer, p_author)
     and (
       p_author = p_viewer
       or private.is_linked(p_viewer, p_author)
       or exists (
         select 1
           from public.follows f
           cross join lateral (
             select case when f.follower_id = p_viewer then f.followee_id else f.follower_id end as y
           ) c
          where f.status = 'accepted'
            and p_viewer in (f.follower_id, f.followee_id)
            and c.y <> p_viewer and c.y <> p_author
            and private.is_room_member(p_room_id, c.y)
            and private.is_linked(p_viewer, c.y)
            and private.is_linked(c.y, p_author)
       )
     )
$$;
comment on function private.can_see_chat_author_for(uuid, uuid, uuid) is
  'Privacy: the viewer sees an author in a room if it is themself, linked to them (accepted follow in either direction), or linked to a friend of theirs who is declared in the same room (same room only); a block between viewer and author always hides them. Evaluated at every read: if the common friend leaves or unfollows, the two stop seeing each other, past messages included.';

create or replace function private.can_see_chat_author(p_room_id uuid, p_author uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select private.can_see_chat_author_for(auth.uid(), p_room_id, p_author)
$$;
comment on function private.can_see_chat_author(uuid, uuid) is
  'Privacy: wrapper of can_see_chat_author_for for the caller (auth.uid()); used by the chat_messages policy and the chat RPCs.';

-- ---------------------------------------------------------------- readers (same columns, only the rule changes)

create or replace function public.get_my_chat_rooms()
returns table (
  room_id uuid, venue_id uuid, venue_name text, event_id uuid, event_name text, expires_at timestamptz,
  friends_inside int, photo_count int, last_kind text, last_text text, last_handle text, last_at timestamptz
)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_me uuid := private.require_user();
begin
  return query
  select r.id, v.id, v.name, e.id, e.name, r.expires_at,
         (select count(distinct d.user_id)::int from public.declarations d
           where (d.night_id = r.night_id or d.event_id = r.event_id)
             and d.user_id <> v_me and private.can_see_chat_author(r.id, d.user_id)),
         (select count(*)::int from public.chat_messages m
           where m.room_id = r.id and m.kind = 'photo' and private.can_see_chat_author(r.id, m.user_id)),
         last.kind, last.text, last.handle, last.created_at
    from public.chat_rooms r
    left join public.nights n on n.id = r.night_id
    left join public.events e on e.id = r.event_id
    join public.venues v on v.id = coalesce(n.venue_id, e.venue_id)
    left join lateral (
      select m.kind, m.text, p.handle, m.created_at
        from public.chat_messages m join public.profiles p on p.id = m.user_id
       where m.room_id = r.id and private.can_see_chat_author(r.id, m.user_id)
       order by m.created_at desc limit 1
    ) last on true
   where private.is_room_member(r.id, v_me)
   order by last.created_at desc nulls last, r.expires_at desc;
end $$;
comment on function public.get_my_chat_rooms() is
  'Privacy: rooms the caller belongs to; friends_inside, photo_count and the last message only consider authors the caller may see in that room (self, linked, or linked through a friend declared in the same room; no blocked pairs), so other strangers stay invisible.';

create or replace function public.get_room_messages(p_room_id uuid, p_before timestamptz default null, p_limit int default 50)
returns table (message_id uuid, user_id uuid, handle text, kind text, text text, created_at timestamptz, is_mine boolean)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_me uuid := private.require_user();
begin
  if not private.is_room_member(p_room_id, v_me) then
    raise exception 'NOT_ROOM_MEMBER' using errcode = 'P0001';
  end if;
  return query
  select m.id, m.user_id, p.handle, m.kind, m.text, m.created_at, m.user_id = v_me
    from public.chat_messages m join public.profiles p on p.id = m.user_id
   where m.room_id = p_room_id and private.can_see_chat_author(p_room_id, m.user_id)
     and (p_before is null or m.created_at < p_before)
   order by m.created_at desc, m.id desc
   limit least(greatest(coalesce(p_limit, 50), 1), 100);
end $$;
comment on function public.get_room_messages(uuid, timestamptz, int) is
  'Privacy: members of a live room only; returns the messages of authors the caller may see in that room (self, linked, or linked through a friend declared in the same room; no blocked pairs); never the photo path, photos are signed per message by chat-photo-urls.';

create or replace function public.get_chat_photo_paths(p_message_ids uuid[])
returns table (message_id uuid, photo_path text)
language plpgsql stable security definer set search_path = public as $$
#variable_conflict use_column
declare v_me uuid := private.require_user();
begin
  if coalesce(array_length(p_message_ids, 1), 0) > 100 then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  return query
  select m.id, m.photo_path
    from public.chat_messages m
   where m.id = any (p_message_ids) and m.kind = 'photo'
     and private.is_room_member(m.room_id, v_me) and private.can_see_chat_author(m.room_id, m.user_id);
end $$;
comment on function public.get_chat_photo_paths(uuid[]) is
  'Privacy: storage paths only for photo messages the caller may see (live room, author visible in that room by the chat rule, no block); used by the chat-photo-urls Edge Function, which signs them for 1 hour.';

-- Realtime evaluates this policy per subscriber: without the new rule friends-of-friends would never receive live messages.
drop policy if exists chat_messages_read on public.chat_messages;
create policy chat_messages_read on public.chat_messages for select to authenticated
  using (private.is_room_member(room_id, auth.uid()) and private.can_see_chat_author(room_id, user_id));

-- One row per recipient who can see the author in that room; the text and the photo are never copied.
create or replace function private.notify_chat_message() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_venue text; v_handle text; v_member uuid;
begin
  select v.name into v_venue
    from public.chat_rooms r
    left join public.nights n on n.id = r.night_id
    left join public.events e on e.id = r.event_id
    join public.venues v on v.id = coalesce(n.venue_id, e.venue_id)
   where r.id = new.room_id;
  select handle into v_handle from public.profiles where id = new.user_id;
  for v_member in
    select distinct d.user_id
      from public.chat_rooms r join public.declarations d on (d.night_id = r.night_id or d.event_id = r.event_id)
     where r.id = new.room_id and r.expires_at > now() and d.user_id <> new.user_id
  loop
    if private.can_see_chat_author_for(v_member, new.room_id, new.user_id) then
      perform private.enqueue_notification(v_member, 'chat', 'chat_message', 'room:' || new.room_id,
        jsonb_build_object('room_id', new.room_id, 'venue_name', v_venue, 'handle', v_handle), new.user_id);
    end if;
  end loop;
  return new;
end $$;

-- ---------------------------------------------------------------- old signatures out, privileges

drop function private.can_see_chat_author(uuid);
drop function private.can_see_chat_author_for(uuid, uuid);

revoke all on function private.is_linked(uuid, uuid), private.can_see_chat_author_for(uuid, uuid, uuid),
  private.can_see_chat_author(uuid, uuid) from public, anon, authenticated;
-- the policy runs as the caller: only the auth.uid() wrapper is executable (the nested calls run as the owner)
grant execute on function private.can_see_chat_author(uuid, uuid) to authenticated;
revoke all on function public.get_my_chat_rooms(), public.get_room_messages(uuid, timestamptz, int),
  public.get_chat_photo_paths(uuid[]) from public, anon, authenticated;
grant execute on function public.get_my_chat_rooms(), public.get_room_messages(uuid, timestamptz, int),
  public.get_chat_photo_paths(uuid[]) to authenticated, service_role;
