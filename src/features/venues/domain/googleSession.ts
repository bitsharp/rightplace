export const GOOGLE_DEBOUNCE_MS = 300;
export const GOOGLE_MIN_QUERY = 3;

export const isGoogleQueryReady = (query: string): boolean =>
  query.trim().length >= GOOGLE_MIN_QUERY;

export type SessionEvent = 'type' | 'select' | 'clear';

// One token per typing session: it opens with the first keystroke and closes with a selection (the Details call that
// bills the session) or when the field is emptied. The server counts sessions by token, so this only keeps Google's
// billing grouping right.
export function nextSessionToken(
  token: string | null,
  event: SessionEvent,
  make: () => string,
): string | null {
  if (event !== 'type') return null;
  return token ?? make();
}
