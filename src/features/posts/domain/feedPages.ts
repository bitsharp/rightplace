import type { FeedCursor, FeedPost } from './types';

// Keyset cursor: visible_from alone repeats (every post of a night shares it), so the id breaks ties.
export function nextCursor(
  page: readonly Pick<FeedPost, 'id' | 'visibleFrom'>[],
  limit: number,
): FeedCursor | undefined {
  const last = page[page.length - 1];
  if (!last || page.length < limit) return undefined;
  return { beforeVisible: last.visibleFrom, beforeId: last.id };
}
