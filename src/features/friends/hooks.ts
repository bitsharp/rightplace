import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';

import {
  fetchBlockedUsers,
  fetchFollowers,
  fetchFollowing,
  fetchFollowRequests,
  fetchFollowRequestsCount,
  searchUsers,
  type Following,
} from './api';
import { newlyAccepted } from './domain/followDiff';
import { isSearchable, normalizeSearchQuery } from './domain/searchQuery';
import {
  BLOCKED_KEY,
  FOLLOW_REQUESTS_COUNT_KEY,
  FOLLOW_REQUESTS_KEY,
  FOLLOWERS_KEY,
  FOLLOWING_KEY,
  invalidateFollowDependents,
  userSearchKey,
} from './keys';

export * from './keys';
export * from './mutations';

export const USER_SEARCH_DEBOUNCE_MS = 300;
export const FOLLOWING_REFETCH_MS = 60 * 1000;

const PRIVATE = { persist: false } as const;

function useDebounced(value: string, delayMs: number): string {
  // Starts empty: even the first typed text waits for the pause, so no request leaves per keystroke.
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// Who a stranger is never persists: results can include people the user stopped following.
export function useUserSearch(text: string) {
  const query = normalizeSearchQuery(useDebounced(text, USER_SEARCH_DEBOUNCE_MS));
  return useQuery({
    queryKey: userSearchKey(query),
    queryFn: () => searchUsers(query),
    enabled: isSearchable(query),
    meta: PRIVATE,
  });
}

// Tonight's venues of the people I follow move all evening. When someone accepted me since the
// last fetch, the map of friends, feed and stories must be reloaded too.
export function useFollowing() {
  const queryClient = useQueryClient();
  const focused = useIsFocused();
  return useQuery({
    queryKey: FOLLOWING_KEY,
    queryFn: async () => {
      const previous = queryClient.getQueryData<Following[]>(FOLLOWING_KEY);
      const next = await fetchFollowing();
      const added = newlyAccepted(
        previous?.map((person) => person.userId),
        next.map((person) => person.userId),
      );
      if (added.length > 0) void invalidateFollowDependents(queryClient);
      return next;
    },
    refetchInterval: focused ? FOLLOWING_REFETCH_MS : false,
    refetchOnWindowFocus: true,
    meta: PRIVATE,
  });
}

// Deep links (rightplace://u/<handle>): the exact handle out of the same search the tab uses, so
// the cache and the optimistic follow updates are shared.
export function usePublicProfile(handle: string) {
  const query = normalizeSearchQuery(handle);
  return useQuery({
    queryKey: userSearchKey(query),
    queryFn: () => searchUsers(query),
    select: (rows) => rows.find((row) => row.handle === query) ?? null,
    enabled: isSearchable(query),
    meta: PRIVATE,
  });
}

export function useFollowers() {
  return useQuery({ queryKey: FOLLOWERS_KEY, queryFn: fetchFollowers, meta: PRIVATE });
}

export function useFollowRequests() {
  return useQuery({ queryKey: FOLLOW_REQUESTS_KEY, queryFn: fetchFollowRequests, meta: PRIVATE });
}

export function useFollowRequestsCount() {
  return useQuery({
    queryKey: FOLLOW_REQUESTS_COUNT_KEY,
    queryFn: fetchFollowRequestsCount,
    refetchInterval: FOLLOWING_REFETCH_MS,
    refetchOnWindowFocus: true,
    meta: PRIVATE,
  });
}

export function useBlockedUsers() {
  return useQuery({ queryKey: BLOCKED_KEY, queryFn: fetchBlockedUsers, meta: PRIVATE });
}
