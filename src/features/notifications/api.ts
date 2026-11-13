import { z } from 'zod';

import { callRpc } from '@/lib/callRpc';
import { RpcError, toRpcErrorCode } from '@/lib/rpcError';
import { supabase } from '@/lib/supabase';

import { parseNotificationPrefs, toServerPrefs, type NotificationPrefs } from './domain/prefs';

export const FALLBACK_TIMEZONE = 'Europe/Rome';

export async function fetchNotificationPrefs(): Promise<NotificationPrefs> {
  return parseNotificationPrefs(await callRpc<unknown>('get_my_notification_prefs'));
}

export async function saveNotificationPrefs(
  patch: Partial<NotificationPrefs>,
): Promise<NotificationPrefs> {
  const saved = await callRpc<unknown>('set_my_notification_prefs', {
    p_prefs: toServerPrefs(patch),
  });
  return parseNotificationPrefs(saved);
}

export async function registerPushToken(token: string, platform: 'ios' | 'android'): Promise<void> {
  await callRpc('register_push_token', { p_token: token, p_platform: platform });
}

export async function unregisterPushToken(token: string): Promise<void> {
  await callRpc('unregister_push_token', { p_token: token });
}

export type ActivityKind = 'like' | 'comment' | 'follow_request' | 'follow_accepted';
export type ActivityItem = {
  kind: ActivityKind;
  actorHandle: string;
  postId: string | null;
  createdAt: string;
};

const activitySchema = z.array(
  z.object({
    kind: z.enum(['like', 'comment', 'follow_request', 'follow_accepted']),
    actor_handle: z.string(),
    post_id: z.string().nullable(),
    created_at: z.string(),
  }),
);

// Handles and times only: the server never returns the text of a comment.
export async function fetchActivity(): Promise<ActivityItem[]> {
  const rows = activitySchema.parse(await callRpc<unknown>('get_my_activity'));
  return rows.map((row) => ({
    kind: row.kind,
    actorHandle: row.actor_handle,
    postId: row.post_id,
    createdAt: row.created_at,
  }));
}

// The city catalog is readable by every signed-in user; reminders use the city's clock.
export async function fetchCityTimezone(citySlug: string): Promise<string> {
  const { data, error } = await supabase
    .from('cities')
    .select('timezone')
    .eq('slug', citySlug)
    .maybeSingle();
  if (error) throw new RpcError(toRpcErrorCode(error));
  return data?.timezone ?? FALLBACK_TIMEZONE;
}
