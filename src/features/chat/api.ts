import { z } from 'zod';

import { callRpc } from '@/lib/callRpc';
import { RpcError, toRpcErrorCode } from '@/lib/rpcError';
import { supabase } from '@/lib/supabase';

import type { ChatMessage } from './domain/messages';

export type ChatRoom = {
  roomId: string;
  venueId: string;
  venueName: string;
  eventId: string | null;
  eventName: string | null;
  expiresAt: string;
  friendsInside: number;
  photoCount: number;
  lastKind: 'text' | 'photo' | null;
  lastText: string | null;
  lastHandle: string | null;
  lastAt: string | null;
};

export const MESSAGES_PAGE_SIZE = 50;

const roomSchema = z.object({
  room_id: z.string(),
  venue_id: z.string(),
  venue_name: z.string(),
  event_id: z.string().nullable(),
  event_name: z.string().nullable(),
  expires_at: z.string(),
  friends_inside: z.number().int(),
  photo_count: z.number().int(),
  last_kind: z.enum(['text', 'photo']).nullable(),
  last_text: z.string().nullable(),
  last_handle: z.string().nullable(),
  last_at: z.string().nullable(),
});

const messageSchema = z.object({
  message_id: z.string(),
  user_id: z.string(),
  handle: z.string(),
  kind: z.enum(['text', 'photo']),
  text: z.string().nullable(),
  created_at: z.string(),
  is_mine: z.boolean(),
});

const sentSchema = z.object({ message_id: z.string(), created_at: z.string() });
const photoUrlsSchema = z.object({
  urls: z.array(z.object({ messageId: z.string(), url: z.string() })),
});

// The server already returns only the caller's rooms and, inside them, only people they follow (principle 6).
export async function fetchMyChatRooms(): Promise<ChatRoom[]> {
  const rows = z.array(roomSchema).parse(await callRpc<unknown>('get_my_chat_rooms'));
  return rows.map((row) => ({
    roomId: row.room_id,
    venueId: row.venue_id,
    venueName: row.venue_name,
    eventId: row.event_id,
    eventName: row.event_name,
    expiresAt: row.expires_at,
    friendsInside: row.friends_inside,
    photoCount: row.photo_count,
    lastKind: row.last_kind,
    lastText: row.last_text,
    lastHandle: row.last_handle,
    lastAt: row.last_at,
  }));
}

export async function fetchRoomMessages(roomId: string, before?: string): Promise<ChatMessage[]> {
  const rows = z.array(messageSchema).parse(
    await callRpc<unknown>('get_room_messages', {
      p_room_id: roomId,
      p_before: before ?? null,
      p_limit: MESSAGES_PAGE_SIZE,
    }),
  );
  return rows.map((row) => ({
    id: row.message_id,
    userId: row.user_id,
    handle: row.handle,
    kind: row.kind,
    text: row.text,
    createdAt: row.created_at,
    isMine: row.is_mine,
  }));
}

export type OutgoingMessage = { text: string } | { photoPath: string };

export async function sendChatMessage(
  roomId: string,
  message: OutgoingMessage,
): Promise<{ messageId: string; createdAt: string }> {
  const rows = z.array(sentSchema).parse(
    await callRpc<unknown>('send_chat_message', {
      p_room_id: roomId,
      p_text: 'text' in message ? message.text : null,
      p_photo_path: 'photoPath' in message ? message.photoPath : null,
    }),
  );
  const [sent] = rows;
  if (!sent) throw new RpcError('UNKNOWN');
  return { messageId: sent.message_id, createdAt: sent.created_at };
}

// Photos have no public URL: the Edge Function signs (1 h) only what the database says the caller may see.
export async function fetchPhotoUrls(messageIds: string[]): Promise<Record<string, string>> {
  if (messageIds.length === 0) return {};
  const { data, error } = await supabase.functions.invoke('chat-photo-urls', {
    body: { messageIds },
  });
  if (error) throw new RpcError(toRpcErrorCode(error));
  const parsed = photoUrlsSchema.parse(data);
  return Object.fromEntries(parsed.urls.map(({ messageId, url }) => [messageId, url]));
}

// Moderation (principle 7): the report goes to moderators only; the author is never told who reported.
export async function reportMessage(messageId: string, reason?: string): Promise<void> {
  await callRpc<unknown>('report', {
    p_target_kind: 'message',
    p_target_id: messageId,
    p_reason: reason ?? null,
  });
}
