import { createClient } from 'npm:@supabase/supabase-js@2';
import { handlePhotoUrls, type SignedPath, type VisiblePhoto } from './handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function visiblePhotoPaths(
  authorization: string,
  messageIds: string[],
): Promise<VisiblePhoto[]> {
  const asUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await asUser.rpc('get_chat_photo_paths', { p_message_ids: messageIds });
  if (error) throw new Error('PHOTO_PATHS_FAILED');
  return (data ?? []).map((row: { message_id: string; photo_path: string }) => ({
    messageId: row.message_id,
    photoPath: row.photo_path,
  }));
}

async function signPaths(paths: string[], ttlSeconds: number): Promise<SignedPath[]> {
  const { data, error } = await admin.storage
    .from('chat-photos')
    .createSignedUrls(paths, ttlSeconds);
  if (error) throw new Error('SIGN_FAILED');
  return (data ?? []).flatMap((item) =>
    item.path !== null && item.signedUrl ? [{ path: item.path, signedUrl: item.signedUrl }] : [],
  );
}

Deno.serve((request) => handlePhotoUrls(request, { visiblePhotoPaths, signPaths }));
