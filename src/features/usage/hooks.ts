import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { useManualRefresh } from '@/lib/useManualRefresh';

import { fetchUsageOverview, fetchUserUsage } from './api';
import { nextUsageCursor, type UsagePeriod } from './domain/types';

const SEARCH_DEBOUNCE_MS = 300;

function useDebounced(value: string, delayMs: number): string {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

// Admin data is never written to disk (meta.persist false): handles and habits of other people.
export function useUsageOverview(days: UsagePeriod, search: string) {
  const query = useQuery({
    queryKey: ['admin', 'usageOverview', days, useDebounced(search.trim(), SEARCH_DEBOUNCE_MS)],
    queryFn: ({ queryKey }) => fetchUsageOverview(days, String(queryKey[3])),
    placeholderData: keepPreviousData,
    meta: { persist: false },
  });
  const manual = useManualRefresh(query.refetch);
  return {
    users: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    isRefreshing: manual.isRefreshing,
    refresh: manual.refresh,
  };
}

export function useUserUsage(userId: string) {
  const query = useInfiniteQuery({
    queryKey: ['admin', 'userUsage', userId],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchUserUsage(userId, pageParam),
    getNextPageParam: nextUsageCursor,
    meta: { persist: false },
  });
  const manual = useManualRefresh(query.refetch);
  return {
    events: query.data?.pages.flat() ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    isRefreshing: manual.isRefreshing,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
    refresh: manual.refresh,
  };
}
