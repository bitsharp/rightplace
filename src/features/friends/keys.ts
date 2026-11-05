import type { QueryClient } from '@tanstack/react-query';

export const USER_SEARCH_KEY = ['userSearch'] as const;
export const userSearchKey = (query: string) => [...USER_SEARCH_KEY, query] as const;
export const FOLLOWING_KEY = ['friends', 'following'] as const;
export const FOLLOWERS_KEY = ['followers'] as const;
export const FOLLOW_REQUESTS_ROOT_KEY = ['followRequests'] as const;
export const FOLLOW_REQUESTS_KEY = [...FOLLOW_REQUESTS_ROOT_KEY, 'list'] as const;
export const FOLLOW_REQUESTS_COUNT_KEY = [...FOLLOW_REQUESTS_ROOT_KEY, 'count'] as const;
export const BLOCKED_KEY = ['blocked'] as const;

// Everything that is visible only through an accepted follow: when the set of followed people
// changes, the map of friends, the feed, the stories bar and the venue friends must be reloaded.
const FOLLOW_DEPENDENT_KEYS = [['cityMap'], ['feed'], ['stories'], ['venueStats']] as const;

export function invalidateFollowDependents(queryClient: QueryClient): Promise<unknown> {
  return Promise.all(
    FOLLOW_DEPENDENT_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
  );
}

export function invalidateKeys(
  queryClient: QueryClient,
  keys: readonly (readonly unknown[])[],
): Promise<unknown> {
  return Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}
