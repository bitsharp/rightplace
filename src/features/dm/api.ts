import { z } from 'zod';

import { callRpc } from '@/lib/callRpc';
import { RpcError } from '@/lib/rpcError';

import type { DmMessage } from './domain/messages';

export type DmError = 'NOT_LINKED' | 'RATE_LIMITED' | 'INVALID_TEXT' | 'UNKNOWN';

export type DmThread = {
  threadId: string;
  otherUserId: string;
  otherHandle: string;
  lastText: string;
  lastMessageAt: string;
  lastSenderIsMe: boolean;
  unread: boolean;
};

export const DM_PAGE_SIZE = 50;

const threadSchema = z.object({
  thread_id: z.string(),
  other_user_id: z.string(),
  other_handle: z.string(),
  last_text: z.string(),
  last_message_at: z.string(),
  last_sender_is_me: z.boolean(),
  unread: z.boolean(),
});

const messageSchema = z.object({
  id: z.string(),
  sender_is_me: z.boolean(),
  sender_id: z.string(),
  text: z.string(),
  created_at: z.string(),
});

const sentSchema = z.object({ id: z.string(), created_at: z.string() });

const DM_ERRORS: readonly DmError[] = ['NOT_LINKED', 'RATE_LIMITED', 'INVALID_TEXT'];

export function dmErrorOf(error: unknown): DmError {
  if (!(error instanceof RpcError)) return 'UNKNOWN';
  return DM_ERRORS.find((code) => code === error.code) ?? 'UNKNOWN';
}

// The server returns only my own conversations and only while the friendship holds (principle 6).
export async function fetchDmThreads(): Promise<DmThread[]> {
  const rows = z.array(threadSchema).parse(await callRpc<unknown>('get_dm_threads'));
  return rows.map((row) => ({
    threadId: row.thread_id,
    otherUserId: row.other_user_id,
    otherHandle: row.other_handle,
    lastText: row.last_text,
    lastMessageAt: row.last_message_at,
    lastSenderIsMe: row.last_sender_is_me,
    unread: row.unread,
  }));
}

export async function fetchDmMessages(threadId: string, before?: string): Promise<DmMessage[]> {
  const rows = z.array(messageSchema).parse(
    await callRpc<unknown>('get_dm_messages', {
      p_thread: threadId,
      p_before: before ?? null,
      p_limit: DM_PAGE_SIZE,
    }),
  );
  return rows.map((row) => ({
    id: row.id,
    senderId: row.sender_id,
    isMine: row.sender_is_me,
    text: row.text,
    createdAt: row.created_at,
  }));
}

export async function sendDm(
  threadId: string,
  text: string,
): Promise<{ id: string; createdAt: string }> {
  const rows = z
    .array(sentSchema)
    .parse(await callRpc<unknown>('send_dm', { p_thread: threadId, p_text: text }));
  const [sent] = rows;
  if (!sent) throw new RpcError('UNKNOWN');
  return { id: sent.id, createdAt: sent.created_at };
}

export async function openDmThread(handle: string): Promise<string> {
  return z.string().parse(await callRpc<unknown>('open_dm_thread', { p_handle: handle }));
}

export async function markDmRead(threadId: string): Promise<void> {
  await callRpc<unknown>('mark_dm_read', { p_thread: threadId });
}

// The badge is a nicety: until the server has the DM migration (or while offline) it is simply zero.
export async function fetchDmUnreadCount(): Promise<number> {
  try {
    return z
      .number()
      .int()
      .parse(await callRpc<unknown>('get_dm_unread_count'));
  } catch {
    return 0;
  }
}

// Moderation (principle 7): the report goes to moderators only; the server accepts it from thread members.
export async function reportDm(messageId: string, reason?: string): Promise<void> {
  await callRpc<unknown>('report', {
    p_target_kind: 'dm',
    p_target_id: messageId,
    p_reason: reason ?? null,
  });
}
