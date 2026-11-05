import type { ChatMessage } from './messages';

// Principle 6, defense in depth: the room holds everyone who declared, but a user sees only their own
// messages and those of people they follow (accepted). The server already filters (get_room_messages and the
// table policy); this keeps anything that slips through, e.g. a stale cache after an unfollow, off the screen.
export function visibleMessages(
  messages: ChatMessage[],
  meId: string,
  followingIds: readonly string[],
): ChatMessage[] {
  const allowed = new Set([meId, ...followingIds]);
  return messages.filter((message) => allowed.has(message.userId));
}
