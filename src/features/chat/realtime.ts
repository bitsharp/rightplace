import { z } from 'zod';

import type { ChatMessage } from './domain/messages';

export type RealtimePerson = { userId: string; handle: string };

const MIN_BACKOFF_MS = 1000;
const MAX_BACKOFF_MS = 30_000;

const insertSchema = z.object({
  id: z.string(),
  room_id: z.string(),
  user_id: z.string(),
  kind: z.enum(['text', 'photo']),
  text: z.string().nullable(),
  created_at: z.string(),
});

export const backoffMs = (attempt: number): number =>
  Math.min(MIN_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS);

// Realtime applies the table policy per subscriber, so the server only sends what this user may read.
// This check repeats it on the client (principle 6): a payload from someone I do not follow is dropped.
// The row's photo_path is deliberately not copied: photos are read only through signed URLs.
export function parseInsertedMessage(
  payload: unknown,
  roomId: string,
  me: RealtimePerson,
  following: RealtimePerson[],
): ChatMessage | null {
  const parsed = insertSchema.safeParse(payload);
  if (!parsed.success || parsed.data.room_id !== roomId) return null;
  const row = parsed.data;
  const author = row.user_id === me.userId ? me : following.find((p) => p.userId === row.user_id);
  if (!author) return null;
  return {
    id: row.id,
    userId: row.user_id,
    handle: author.handle,
    kind: row.kind,
    text: row.text,
    createdAt: row.created_at,
    isMine: row.user_id === me.userId,
  };
}
