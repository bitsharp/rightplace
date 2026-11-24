// The server accepts at most this many ids per request (get_avatar_paths): longer lists are split, never cut.
export const MAX_AVATAR_IDS = 100;

// Same people in any order give the same cache key, so a list that re-renders never refetches.
export function normalizeAvatarIds(ids: readonly (string | null | undefined)[]): string[] {
  const unique = new Set(ids.filter((id): id is string => typeof id === 'string' && id !== ''));
  return [...unique].sort();
}
