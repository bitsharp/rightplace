import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleAvatarUrls, type SignedPath, type VisibleAvatar } from './handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function visibleAvatarPaths(
  authorization: string,
  userIds: string[],
): Promise<VisibleAvatar[]> {
  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await asUser.rpc('get_avatar_paths', { p_user_ids: userIds });
  if (error) throw new Error('AVATAR_PATHS_FAILED');
  return (data ?? []).map((row: { user_id: string; avatar_path: string }) => ({
    userId: row.user_id,
    avatarPath: row.avatar_path,
  }));
}

async function signPaths(paths: string[], ttlSeconds: number): Promise<SignedPath[]> {
  const { data, error } = await admin.storage.from('avatars').createSignedUrls(paths, ttlSeconds);
  if (error) throw new Error('SIGN_FAILED');
  return (data ?? []).flatMap((item) =>
    item.path !== null && item.signedUrl ? [{ path: item.path, signedUrl: item.signedUrl }] : [],
  );
}

Deno.serve((request) => handleAvatarUrls(request, { visibleAvatarPaths, signPaths }));
