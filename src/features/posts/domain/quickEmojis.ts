// Same limit as the server (`add_post_comment`: trimmed char_length 1-300).
export const MAX_COMMENT_LENGTH = 300;

// Order as on Instagram; `key` names the emoji in `ui:quickEmoji.names` for screen readers.
export const QUICK_EMOJIS = [
  { emoji: '❤️', key: 'heart' },
  { emoji: '🙌', key: 'raisedHands' },
  { emoji: '🔥', key: 'fire' },
  { emoji: '👏', key: 'clap' },
  { emoji: '😢', key: 'cry' },
  { emoji: '😍', key: 'heartEyes' },
  { emoji: '😮', key: 'wow' },
  { emoji: '😂', key: 'laugh' },
] as const;

export type Selection = { start: number; end: number };

// Postgres char_length counts code points: Array.from does too, `.length` (UTF-16 units) does not,
// so a comment the client accepts is never refused by the server, and vice versa.
export function commentLength(text: string): number {
  return Array.from(text).length;
}

// Cut by code points, never inside a surrogate pair (TextInput.maxLength counts UTF-16 units).
export function clampCommentLength(text: string): string {
  const points = Array.from(text);
  return points.length <= MAX_COMMENT_LENGTH ? text : points.slice(0, MAX_COMMENT_LENGTH).join('');
}

// Replaces the selection (or appends when the cursor is unknown); the cursor lands after the emoji.
export function insertAtSelection(
  text: string,
  selection: Selection | null,
  emoji: string,
): { text: string; cursor: number } {
  const start = Math.min(selection?.start ?? text.length, text.length);
  const end = Math.min(Math.max(selection?.end ?? start, start), text.length);
  return {
    text: text.slice(0, start) + emoji + text.slice(end),
    cursor: start + emoji.length,
  };
}
