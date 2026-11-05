-- 0019 — Night chat (prompt 10): membership that outlives the declaration, RPC-only sending,
-- visibility-aware reads, signed-URL support and the file-deletion pipeline.
-- Principles 5 (ephemeral), 6 (only accepted follows are visible), 7 (moderation hooks).

-- ---------------------------------------------------------------- membership

-- Before, membership required an ACTIVE declaration. Declarations end at 06:00 after the night, so nobody could
-- enter the chat afterwards and the "2 days" TTL meant nothing. Now any non-cancelled declaration (an existing row;
-- undeclare() deletes it) on the room's night/event grants access while the room itself is alive.
create or replace function private.is_room_member(p_room_id uuid, p_user_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.chat_rooms r
      join public.declarations d
        on (d.night_id = r.night_id or d.event_id = r.event_id)
     where r.id = p_room_id and d.user_id = p_user_id and r.expires_at > now()
  )
$$;

-- Principle 6 in one place: my own messages, or those of someone I follow (accepted), never across a block.
create or replace function private.can_see_chat_author(p_author uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (p_author = auth.uid() or private.is_following(auth.uid(), p_author))
     and not private.is_blocked_pair(auth.uid(), p_author)
$$;

-- ---------------------------------------------------------------- sending only through the RPC

drop policy if exists chat_messages_insert on public.chat_messages;
revoke insert on public.chat_messages from authenticated;

create or replace function public.send_chat_message(p_room_id uuid, p_text text default null, p_photo_path text default null)
returns table (message_id uuid, created_at timestamptz)
language plpgsql security definer set search_path = public as $$
#variable_conflict use_column
declare
  v_me uuid := private.require_user();
  v_text text := nullif(btrim(p_text), '');
begin
  if not private.is_room_member(p_room_id, v_me) then
    raise exception 'NOT_ROOM_MEMBER' using errcode = 'P0001';
  end if;
  if (v_text is null) = (p_photo_path is null) or char_length(coalesce(v_text, '')) > 1000 then
    raise exception 'INVALID_MESSAGE' using errcode = 'P0001';
  end if;
  -- the path must be exactly <my id>/<uuid>.jpg: nobody can attach somebody else's file to a message
  if p_photo_path is not null and p_photo_path !~ ('^' || v_me::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$') then
    raise exception 'INVALID_PHOTO_PATH' using errcode = 'P0001';
  end if;
  return query
  insert into public.chat_messages (room_id, user_id, kind, text, photo_path)
  values (p_room_id, v_me, case when p_photo_path is null then 'text' else 'photo' end, v_text, p_photo_path)
  returning chat_messages.id, chat_messages.created_at;
end $$;
comment on function public.send_chat_message(uuid, text, text) is
  'Privacy: members of a live room only; text 1-1000 chars or a photo whose path is exactly <caller id>/<uuid>.jpg; the only write path to chat_messages.';

-- ---------------------------------------------------------------- reads

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
             and d.user_id <> v_me and private.can_see_chat_author(d.user_id)),
         (select count(*)::int from public.chat_messages m
           where m.room_id = r.id and m.kind = 'photo' and private.can_see_chat_author(m.user_id)),
         last.kind, last.text, last.handle, last.created_at
    from public.chat_rooms r
    left join public.nights n on n.id = r.night_id
    left join public.events e on e.id = r.event_id
    join public.venues v on v.id = coalesce(n.venue_id, e.venue_id)
    left join lateral (
      select m.kind, m.text, p.handle, m.created_at
        from public.chat_messages m join public.profiles p on p.id = m.user_id
       where m.room_id = r.id and private.can_see_chat_author(m.user_id)
       order by m.created_at desc limit 1
    ) last on true
   where private.is_room_member(r.id, v_me)
   order by last.created_at desc nulls last, r.expires_at desc;
end $$;
comment on function public.get_my_chat_rooms() is
  'Privacy: rooms the caller belongs to; friends_inside, photo_count and the last message only consider the caller and accepted follows (no blocked pairs), so strangers in the room stay invisible.';

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
   where m.room_id = p_room_id and private.can_see_chat_author(m.user_id)
     and (p_before is null or m.created_at < p_before)
   order by m.created_at desc, m.id desc
   limit least(greatest(coalesce(p_limit, 50), 1), 100);
end $$;
comment on function public.get_room_messages(uuid, timestamptz, int) is
  'Privacy: members of a live room only; returns the caller''s messages and those of accepted follows (no blocked pairs); never the photo path, photos are signed per message by chat-photo-urls.';

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
     and private.is_room_member(m.room_id, v_me) and private.can_see_chat_author(m.user_id);
end $$;
comment on function public.get_chat_photo_paths(uuid[]) is
  'Privacy: storage paths only for photo messages the caller may see (live room, own or accepted-follow author, no block); used by the chat-photo-urls Edge Function, which signs them for 1 hour.';

-- ---------------------------------------------------------------- file deletion queue

-- Every way a message dies (own delete, room purge cascade, account deletion) queues its file.
-- Duplicates with purge_expired_content / process_account_deletions are harmless: removing a missing object is a no-op.
create or replace function private.queue_chat_photo_deletion() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.photo_path is not null then
    insert into private.storage_deletion_queue (bucket_id, object_path) values ('chat-photos', old.photo_path);
  end if;
  return old;
end $$;
create trigger chat_messages_queue_photo after delete on public.chat_messages
  for each row execute function private.queue_chat_photo_deletion();

create or replace function public.claim_storage_deletions(p_limit int default 200)
returns table (id bigint, bucket_id text, object_path text)
language sql stable security definer set search_path = public as $$
  select q.id, q.bucket_id, q.object_path from private.storage_deletion_queue q
   order by q.id limit least(greatest(coalesce(p_limit, 200), 1), 500)
$$;
comment on function public.claim_storage_deletions(int) is
  'Privacy: service role only (storage-gc Edge Function); lists queued files of expired or deleted content.';

create or replace function public.complete_storage_deletions(p_ids bigint[]) returns int
language sql security definer set search_path = public as $$
  with gone as (delete from private.storage_deletion_queue where id = any (p_ids) returning 1)
  select count(*)::int from gone
$$;
comment on function public.complete_storage_deletions(bigint[]) is
  'Privacy: service role only; forgets queue rows once the storage objects are really removed.';

revoke all on function public.send_chat_message(uuid, text, text), public.get_my_chat_rooms(),
  public.get_room_messages(uuid, timestamptz, int), public.get_chat_photo_paths(uuid[]),
  public.claim_storage_deletions(int), public.complete_storage_deletions(bigint[]) from public, anon, authenticated;
grant execute on function public.send_chat_message(uuid, text, text), public.get_my_chat_rooms(),
  public.get_room_messages(uuid, timestamptz, int), public.get_chat_photo_paths(uuid[]) to authenticated, service_role;
grant execute on function public.claim_storage_deletions(int), public.complete_storage_deletions(bigint[]) to service_role;
revoke all on function private.can_see_chat_author(uuid), private.queue_chat_photo_deletion() from public, anon, authenticated;

-- ---------------------------------------------------------------- realtime

-- Realtime evaluates the table's select policy per subscriber, so people only receive what they could read.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables
                      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages') then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

-- ---------------------------------------------------------------- storage-gc from pg_cron

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net;
  end if;
end $$;

-- Calls the storage-gc Edge Function with the key kept in Vault (secrets `storage_gc_url`, `storage_gc_key`).
-- Without them (local, or not yet configured) it only raises a notice: nothing breaks, files just wait in the queue.
create or replace function private.invoke_storage_gc() returns void
language plpgsql security definer set search_path = public as $$
declare v_url text; v_key text;
begin
  if to_regclass('vault.decrypted_secrets') is null or to_regnamespace('net') is null then
    raise notice 'storage-gc skipped: vault or pg_net not available';
    return;
  end if;
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'storage_gc_url';
  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'storage_gc_key';
  if coalesce(v_url, '') = '' or coalesce(v_key, '') = '' then
    raise notice 'storage-gc skipped: storage_gc_url / storage_gc_key missing in Vault';
    return;
  end if;
  perform net.http_post(url := v_url, body := '{}'::jsonb,
    headers := jsonb_build_object('x-gc-key', v_key, 'Content-Type', 'application/json'));
end $$;
revoke all on function private.invoke_storage_gc() from public, anon, authenticated;

-- Every 5 minutes (was 10): purge, then drain the file queue, so expired content is gone well within 10 minutes.
select cron.schedule('purge-expired-content', '*/5 * * * *',
  'select private.purge_expired_content(); select private.invoke_storage_gc();');
