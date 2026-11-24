import { z } from 'zod';

import { callRpc } from '@/lib/callRpc';
import { uploadPhoto } from '@/lib/photos/photos';
import { RpcError, toRpcErrorCode } from '@/lib/rpcError';
import { supabase } from '@/lib/supabase';

import { MAX_AVATAR_IDS } from './avatarIds';

const urlsSchema = z.object({ urls: z.array(z.object({ userId: z.string(), url: z.string() })) });

// Photos have no public URL: the Edge Function signs (1 h) only what the database says the caller may see
// (their own photo and the one of people they follow with an accepted follow). Everyone else is simply absent.
async function fetchAvatarUrlsChunk(userIds: string[]): Promise<Record<string, string>> {
  const { data, error } = await supabase.functions.invoke('avatar-urls', { body: { userIds } });
  if (error) throw new RpcError(toRpcErrorCode(error));
  return Object.fromEntries(urlsSchema.parse(data).urls.map(({ userId, url }) => [userId, url]));
}

// More than MAX_AVATAR_IDS people are asked in several requests: cutting the list would drop random faces.
export async function fetchAvatarUrls(userIds: string[]): Promise<Record<string, string>> {
  const chunks: string[][] = [];
  for (let from = 0; from < userIds.length; from += MAX_AVATAR_IDS) {
    chunks.push(userIds.slice(from, from + MAX_AVATAR_IDS));
  }
  const parts = await Promise.all(chunks.map(fetchAvatarUrlsChunk));
  return Object.assign({}, ...parts) as Record<string, string>;
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
