-- 0031 — In-app feedback: a 1–5 star rating, a comment and an optional screenshot of the screen the
-- user was looking at, sent to support. Only support (service role) can read it.

-- Private bucket: uploads only under the caller's own prefix `<user_id>/…`, no read policy (the
-- screenshot may show other users' content; support reads it from the dashboard with the service role).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('feedback', 'feedback', false, 5242880, array['image/jpeg'])
on conflict (id) do update set public = false;

create policy "own prefix upload feedback" on storage.objects for insert to authenticated
  with check (bucket_id = 'feedback' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own prefix delete feedback" on storage.objects for delete to authenticated
  using (bucket_id = 'feedback' and (storage.foldername(name))[1] = auth.uid()::text);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  comment text not null default '' check (char_length(comment) <= 1000),
  screen text not null check (char_length(screen) between 1 and 200),
  screenshot_path text,
  app_version text check (char_length(app_version) <= 50),
  platform text not null check (platform in ('ios', 'android')),
  locale text check (locale in ('it', 'en')),
  created_at timestamptz not null default now()
);
create index feedback_user_created_idx on public.feedback (user_id, created_at desc);
create index feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;
-- No policy and no table privilege for clients: rows are inserted only by submit_feedback.
revoke all on public.feedback from anon, authenticated;

create or replace function public.submit_feedback(
  p_rating int, p_comment text, p_screen text, p_screenshot_path text,
  p_app_version text, p_platform text, p_locale text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_me uuid := private.require_user();
  v_comment text := btrim(coalesce(p_comment, ''));
  v_screen text := btrim(coalesce(p_screen, ''));
  v_id uuid;
begin
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'INVALID_RATING' using errcode = 'P0001';
  end if;
  if char_length(v_comment) > 1000 then
    raise exception 'INVALID_FEEDBACK_COMMENT' using errcode = 'P0001';
  end if;
  if char_length(v_screen) not between 1 and 200 then
    raise exception 'INVALID_SCREEN' using errcode = 'P0001';
  end if;
  if p_platform is null or p_platform not in ('ios', 'android') then
    raise exception 'INVALID_PLATFORM' using errcode = 'P0001';
  end if;
  -- the path must be exactly the caller's own `<uid>/<uuid>.jpg`: nobody can attach someone else's file
  if p_screenshot_path is not null
     and p_screenshot_path !~ ('^' || v_me::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$') then
    raise exception 'INVALID_SCREENSHOT' using errcode = 'P0001';
  end if;
  if (select count(*) from public.feedback where user_id = v_me and created_at > now() - interval '1 day') >= 10 then
    raise exception 'FEEDBACK_LIMIT' using errcode = 'P0001';
  end if;

  insert into public.feedback (user_id, rating, comment, screen, screenshot_path, app_version, platform, locale)
  values (v_me, p_rating, v_comment, v_screen, p_screenshot_path, left(p_app_version, 50), p_platform,
          case when p_locale in ('it', 'en') then p_locale end)
  returning id into v_id;
  return v_id;
end $$;
comment on function public.submit_feedback(int, text, text, text, text, text, text) is
  'Privacy: only support (service role) reads feedback; the screenshot may show other users'' content and is kept 180 days. Max 10 per day per user.';

revoke all on function public.submit_feedback(int, text, text, text, text, text, text) from public, anon;
grant execute on function public.submit_feedback(int, text, text, text, text, text, text) to authenticated, service_role;

-- Retention: 180 days, screenshots queued for the storage cleaner like chat and post photos.
create or replace function private.purge_old_feedback() returns void
language plpgsql security definer set search_path = public as $$
begin
  insert into private.storage_deletion_queue (bucket_id, object_path)
  select 'feedback', screenshot_path from public.feedback
   where created_at < now() - interval '180 days' and screenshot_path is not null;
  delete from public.feedback where created_at < now() - interval '180 days';
end $$;
revoke all on function private.purge_old_feedback() from public, anon, authenticated;
select cron.schedule('purge-old-feedback', '30 6 * * *', 'select private.purge_old_feedback()');

-- Account deletion (principle 1 and GDPR): feedback and its screenshots go away with the account.
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
  select 'feedback', screenshot_path from public.feedback where user_id = v_me and screenshot_path is not null;

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
         location_opt_in = false, contacts_opt_in = false
   where id = v_me;

  -- an Edge Function with the service role deletes auth.users (cascading the profile) within 24 h
  insert into private.account_deletion_requests (user_id) values (v_me) on conflict do nothing;
end $$;
comment on function public.delete_my_account() is
  'Privacy: erases the caller''s content, relations and personal fields at once; the auth account is removed within 24 h.';
