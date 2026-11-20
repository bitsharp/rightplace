import { z } from 'zod';

import { callRpc } from '@/lib/callRpc';
import { uploadPhoto } from '@/lib/photos/photos';
import { RpcError, toRpcErrorCode } from '@/lib/rpcError';
import { supabase } from '@/lib/supabase';

const urlsSchema = z.object({ urls: z.array(z.object({ userId: z.string(), url: z.string() })) });

// Photos have no public URL: the Edge Function signs (1 h) only what the database says the caller may see
// (their own photo and the one of people they follow with an accepted follow). Everyone else is simply absent.
export async function fetchAvatarUrls(userIds: string[]): Promise<Record<string, string>> {
  if (userIds.length === 0) return {};
  const { data, error } = await supabase.functions.invoke('avatar-urls', { body: { userIds } });
  if (error) throw new RpcError(toRpcErrorCode(error));
  return Object.fromEntries(urlsSchema.parse(data).urls.map(({ userId, url }) => [userId, url]));
}

// `cleanUri` is the output of preparePhoto (square, EXIF-free JPEG, 512 px). The file goes up first; the RPC then
// checks that the path is exactly <my id>/<uuid>.jpg and queues the previous file for removal.
export async function uploadAndSetAvatar(userId: string, cleanUri: string): Promise<void> {
  const path = await uploadPhoto('avatars', userId, cleanUri);
  await callRpc('set_avatar', { p_path: path });
}

export function clearAvatar(): Promise<void> {
  return callRpc('clear_avatar');
}
