export const MAX_SEEN_KEYS = 200;

export const storyKey = (userId: string, latestPostAt: string): string =>
  `${userId}:${latestPostAt}`;

export const isUnseen = (
  story: { userId: string; latestPostAt: string },
  seenKeys: readonly string[],
): boolean => !seenKeys.includes(storyKey(story.userId, story.latestPostAt));

// Bounded on purpose: this set is the only thing stored on the phone, and only keys (no content).
export function markSeen(seenKeys: readonly string[], key: string): string[] {
  return [...seenKeys.filter((seen) => seen !== key), key].slice(-MAX_SEEN_KEYS);
}
