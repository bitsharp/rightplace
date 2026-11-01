-- 0009 — Storage: private buckets for day-after photos and night-chat photos.
-- Uploads only under the caller's own prefix `<user_id>/…`; no read policy at all: images are
-- served exclusively through short-lived signed URLs created server-side (Edge Functions, prompts 10–11).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('posts', 'posts', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic']),
  ('chat-photos', 'chat-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do update set public = false;

create policy "own prefix upload" on storage.objects for insert to authenticated
  with check (bucket_id in ('posts', 'chat-photos') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "own prefix delete" on storage.objects for delete to authenticated
  using (bucket_id in ('posts', 'chat-photos') and (storage.foldername(name))[1] = auth.uid()::text);
