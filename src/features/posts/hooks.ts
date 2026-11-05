import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';

import {
  COMMENTS_PAGE_SIZE,
  fetchComments,
  fetchFeedPage,
  fetchPostPhotoUrls,
  fetchPostTarget,
  fetchStoryPosts,
  FEED_PAGE_SIZE,
} from './api';
import { nextCursor } from './domain/feedPages';
import type { FeedCursor, PostComment } from './domain/types';
import { commentsKey, FEED_KEY, POST_TARGET_KEY, postPhotoUrlsKey, storyPostsKey } from './keys';

export * from './keys';
export * from './mutations';

// Signed URLs live 1 hour: renew a little before.
export const POST_URL_STALE_MS = 50 * 60 * 1000;
const MAX_PHOTOS_PER_REQUEST = 100;

// Principle 5: nothing of other people's posts, comments or photo URLs is ever written to disk.
const PRIVATE = { persist: false } as const;

export function usePostTarget() {
  return useQuery({ queryKey: POST_TARGET_KEY, queryFn: fetchPostTarget, meta: PRIVATE });
}

export function useFeed() {
  const query = useInfiniteQuery({
    queryKey: FEED_KEY,
    initialPageParam: undefined as FeedCursor | undefined,
    queryFn: ({ pageParam }) => fetchFeedPage(pageParam),
    getNextPageParam: (lastPage) => nextCursor(lastPage, FEED_PAGE_SIZE),
    refetchOnWindowFocus: true,
    meta: PRIVATE,
  });
  return {
    posts: query.data?.pages.flat() ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    isRefreshing: query.isRefetching && !query.isFetchingNextPage,
    hasMore: query.hasNextPage,
    loadMore: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
    refresh: async () => {
      await query.refetch();
    },
  };
}

export function useStoryPosts(userId: string, enabled = true) {
  return useQuery({
    queryKey: storyPostsKey(userId),
    queryFn: () => fetchStoryPosts(userId),
    enabled: enabled && userId !== '',
    meta: PRIVATE,
  });
}

// The server returns newest first; the sheet reads oldest first.
export function useComments(postId: string) {
  const query = useInfiniteQuery({
    queryKey: commentsKey(postId),
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => fetchComments(postId, pageParam),
    getNextPageParam: (lastPage: PostComment[]) =>
      lastPage.length < COMMENTS_PAGE_SIZE ? undefined : lastPage[lastPage.length - 1]?.createdAt,
    meta: PRIVATE,
  });
  return {
    comments: (query.data?.pages.flat() ?? []).slice().reverse(),
    isLoading: query.isLoading,
    isError: query.isError,
    hasOlder: query.hasNextPage,
    loadOlder: () => {
      if (query.hasNextPage && !query.isFetchingNextPage) void query.fetchNextPage();
    },
  };
}

export function usePostPhotoUrls(postIds: string[]): Record<string, string> {
  const ids = postIds.slice(0, MAX_PHOTOS_PER_REQUEST);
  const query = useQuery({
    queryKey: postPhotoUrlsKey(ids),
    queryFn: () => fetchPostPhotoUrls(ids),
    enabled: ids.length > 0,
    staleTime: POST_URL_STALE_MS,
    refetchInterval: POST_URL_STALE_MS,
    placeholderData: keepPreviousData,
    meta: PRIVATE,
  });
  return query.data ?? {};
}
