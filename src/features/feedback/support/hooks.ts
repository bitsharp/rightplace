import { useInfiniteQuery } from '@tanstack/react-query';

import { useManualRefresh } from '@/lib/useManualRefresh';

import { fetchSupportInboxPage } from './api';
import { nextSupportCursor } from './domain/supportFeedback';

export const SUPPORT_FEEDBACK_KEY = ['supportFeedback'] as const;

// Feedback texts and signed screenshot URLs are never written to disk.
export function useSupportFeedback() {
  const query = useInfiniteQuery({
    queryKey: SUPPORT_FEEDBACK_KEY,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchSupportInboxPage(pageParam),
    getNextPageParam: nextSupportCursor,
    refetchOnWindowFocus: true,
    meta: { persist: false },
  });
  const manual = useManualRefresh(query.refetch);
  return {
    items: query.data?.pages.flat() ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    isRefreshing: manual.isRefreshing,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
    refresh: manual.refresh,
  };
}
