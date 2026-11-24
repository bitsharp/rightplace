// Same bound as the server (dm_messages.text check).
export const MAX_DM_LENGTH = 1000;

export type DmMessage = {
  id: string;
  senderId: string;
  isMine: boolean;
  text: string;
  createdAt: string;
};

// The server and the cache both list newest first, which is what an inverted list wants.
const newestFirst = (a: DmMessage, b: DmMessage): number =>
  a.createdAt === b.createdAt ? (a.id < b.id ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1;

export function appendDm(list: DmMessage[], message: DmMessage): DmMessage[] {
  if (list.some((existing) => existing.id === message.id)) return list;
  return [...list, message].sort(newestFirst);
}

export type DmListItem = { type: 'message'; message: DmMessage } | { type: 'day'; day: string };

const dayOf = (iso: string): string => {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
};

// For an inverted list (newest first): the separator sits right after the oldest message of each day,
// which is where it draws above that day's first message. `day` is the ISO time of that message.
export function withDaySeparators(messages: DmMessage[]): DmListItem[] {
  return messages.flatMap((message, index): DmListItem[] => {
    const older = messages[index + 1];
    const item: DmListItem = { type: 'message', message };
    if (older && dayOf(older.createdAt) === dayOf(message.createdAt)) return [item];
    return [item, { type: 'day', day: message.createdAt }];
  });
}
