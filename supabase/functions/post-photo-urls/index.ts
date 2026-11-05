import { createClient } from 'npm:@supabase/supabase-js@2';
import { handlePostPhotoUrls, type SignedPath, type VisiblePostPhoto } from './handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function visiblePhotoPaths(
  authorization: string,
  postIds: string[],
): Promise<VisiblePostPhoto[]> {
  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await asUser.rpc('get_post_photo_paths', { p_post_ids: postIds });
  if (error) throw new Error('PHOTO_PATHS_FAILED');
  return (data ?? []).map((row: { post_id: string; photo_path: string }) => ({
    postId: row.post_id,
    photoPath: row.photo_path,
  }));
}

async function signPaths(paths: string[], ttlSeconds: number): Promise<SignedPath[]> {
  const { data, error } = await admin.storage.from('posts').createSignedUrls(paths, ttlSeconds);
  if (error) throw new Error('SIGN_FAILED');
  return (data ?? []).flatMap((item) =>
    item.path !== null && item.signedUrl ? [{ path: item.path, signedUrl: item.signedUrl }] : [],
  );
}

Deno.serve((request) => handlePostPhotoUrls(request, { visiblePhotoPaths, signPaths }));
