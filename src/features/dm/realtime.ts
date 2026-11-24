import { z } from 'zod';

import type { DmMessage } from './domain/messages';

const insertSchema = z.object({
  id: z.string(),
  thread_id: z.string(),
  sender_id: z.string(),
  text: z.string(),
  created_at: z.string(),
});

// Realtime applies the table policy per subscriber (private.can_read_dm_thread): every INSERT that arrives is
// readable by this user by definition, so nothing is filtered here.
export function parseInsertedDm(
  payload: unknown,
  threadId: string,
  meId: string,
): DmMessage | null {
  const parsed = insertSchema.safeParse(payload);
  if (!parsed.success || parsed.data.thread_id !== threadId) return null;
  const row = parsed.data;
  return {
    id: row.id,
    senderId: row.sender_id,
    isMine: row.sender_id === meId,
    text: row.text,
    createdAt: row.created_at,
  };
}
