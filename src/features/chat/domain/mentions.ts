const ACTIVE_MENTION = /(?:^|\s)@([a-z0-9.]*)$/i;
const MENTION = /(?:^|\s)@([a-z]+\.[a-z]+[0-9]*)/gi;

// The text typed after an "@" that starts a word and sits right before the cursor, or null.
export function activeMentionQuery(text: string, cursor: number): string | null {
  const match = ACTIVE_MENTION.exec(text.slice(0, cursor));
  return match ? (match[1] ?? '') : null;
}

// Tagging is allowed only for people I follow (principle 6): never search the whole user base here.
export function suggestMentions(query: string, followingHandles: string[], limit = 5): string[] {
  const prefix = query.toLowerCase();
  return followingHandles
    .filter((handle) => handle.toLowerCase().startsWith(prefix))
    .slice(0, limit);
}

export function insertMention(
  text: string,
  cursor: number,
  handle: string,
): { text: string; cursor: number } {
  const before = text.slice(0, cursor);
  const start = before.lastIndexOf('@');
  const after = text.slice(cursor);
  const gap = after.startsWith(' ') || after.startsWith('\n') ? '' : ' ';
  const head = `${text.slice(0, start)}@${handle}${gap}`;
  return { text: head + after, cursor: head.length + (gap === '' ? 1 : 0) };
}

// Handles tagged in the text that I do not follow: the composer offers a "Segui" chip for each.
export function unknownMentions(
  text: string,
  followingHandles: string[],
  myHandle: string,
): string[] {
  const known = new Set([myHandle, ...followingHandles].map((handle) => handle.toLowerCase()));
  const tagged = [...text.matchAll(MENTION)].map((match) => (match[1] ?? '').toLowerCase());
  return [...new Set(tagged)].filter((handle) => !known.has(handle));
}
