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

export type InsertOutcome =
  { type: 'append'; message: ChatMessage } | { type: 'refetch' } | { type: 'ignore' };

// Realtime applies the table policy per subscriber (private.can_see_chat_author_for), so every INSERT that arrives is
// visible to this user by definition: visibility lives in SQL and is not rebuilt here. What the client may lack is the
// author's handle (a friend of a friend): then it reloads from get_room_messages instead of inventing one.
// The row's photo_path is deliberately not copied: photos are read only through signed URLs.
export function parseInsertedMessage(
  payload: unknown,
  roomId: string,
  me: RealtimePerson,
  knownAuthors: RealtimePerson[],
): InsertOutcome {
  const parsed = insertSchema.safeParse(payload);
  if (!parsed.success || parsed.data.room_id !== roomId) return { type: 'ignore' };
  const row = parsed.data;
  const author =
    row.user_id === me.userId ? me : knownAuthors.find((person) => person.userId === row.user_id);
  if (!author) return { type: 'refetch' };
  return {
    type: 'append',
    message: {
      id: row.id,
      userId: row.user_id,
      handle: author.handle,
      kind: row.kind,
      text: row.text,
      createdAt: row.created_at,
      isMine: row.user_id === me.userId,
    },
  };
}
