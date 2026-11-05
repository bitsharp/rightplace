export type ChatMessage = {
  id: string;
  userId: string;
  handle: string;
  kind: 'text' | 'photo';
  text: string | null;
  createdAt: string;
  isMine: boolean;
  // Client-only states of a message I am sending (optimistic update).
  pending?: boolean;
  failed?: boolean;
};

// The cache and the server both list newest first, which is what an inverted list wants.
const newestFirst = (a: ChatMessage, b: ChatMessage): number =>
  a.createdAt === b.createdAt ? (a.id < b.id ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1;

export function appendMessage(list: ChatMessage[], message: ChatMessage): ChatMessage[] {
  if (list.some((existing) => existing.id === message.id)) return list;
  return [...list, message].sort(newestFirst);
}

export function replacePending(
  list: ChatMessage[],
  tempId: string,
  saved: ChatMessage,
): ChatMessage[] {
  const withoutTemp = list.filter((message) => message.id !== tempId);
  return appendMessage(withoutTemp, saved);
}

export function markFailed(list: ChatMessage[], tempId: string): ChatMessage[] {
  return list.map((message) =>
    message.id === tempId ? { ...message, pending: false, failed: true } : message,
  );
}

export function mergeOlder(list: ChatMessage[], page: ChatMessage[]): ChatMessage[] {
  return page.reduce(appendMessage, list);
}

export function removeMessage(list: ChatMessage[], id: string): ChatMessage[] {
  return list.filter((message) => message.id !== id);
}

// A reload brings only the newest page. What the user already scrolled back to stays, and so do the
// messages still being sent; but if the page is not full the server has nothing older, so older ones are stale.
export function mergeFresh(
  previous: ChatMessage[],
  fresh: ChatMessage[],
  pageSize: number,
): ChatMessage[] {
  const local = previous.filter((message) => message.pending || message.failed);
  const oldestFresh = fresh.at(-1);
  const older =
    fresh.length >= pageSize && oldestFresh
      ? previous.filter(
          (message) => !message.pending && !message.failed && newestFirst(message, oldestFresh) > 0,
        )
      : [];
  return [...local, ...fresh, ...older].reduce<ChatMessage[]>(appendMessage, []);
}

// The server confirmed a message I was sending: keep what the user saw (text, author), adopt id and time.
export function confirmSent(
  list: ChatMessage[],
  tempId: string,
  saved: { messageId: string; createdAt: string },
): ChatMessage[] {
  const temp = list.find((message) => message.id === tempId);
  if (!temp) return list;
  const message = { ...temp, id: saved.messageId, createdAt: saved.createdAt, pending: false };
  return replacePending(list, tempId, message);
}
