import type { InfiniteData, QueryClient, QueryKey } from '@tanstack/react-query';

import type { FeedCursor, FeedPost } from './domain/types';
import { FEED_KEY, STORY_POSTS_ROOT_KEY } from './keys';

export type FeedData = InfiniteData<FeedPost[], FeedCursor | undefined>;
export type Snapshot = [QueryKey, unknown][];

// A post lives in the feed pages and in the story lists at once: every change goes through here so
// the copies never disagree (single source of truth per cache, no extra store).
function mapEverywhere(queryClient: QueryClient, change: (posts: FeedPost[]) => FeedPost[]): void {
  queryClient.setQueriesData<FeedData>({ queryKey: FEED_KEY }, (data) =>
    data ? { ...data, pages: data.pages.map(change) } : data,
  );
  queryClient.setQueriesData<FeedPost[]>({ queryKey: STORY_POSTS_ROOT_KEY }, (posts) =>
    posts ? change(posts) : posts,
  );
}

export function patchPost(
  queryClient: QueryClient,
  postId: string,
  change: (post: FeedPost) => FeedPost,
): void {
  mapEverywhere(queryClient, (posts) =>
    posts.map((post) => (post.id === postId ? change(post) : post)),
  );
}

export function removePostsWhere(
  queryClient: QueryClient,
  shouldRemove: (post: FeedPost) => boolean,
): void {
  mapEverywhere(queryClient, (posts) => posts.filter((post) => !shouldRemove(post)));
}

export function snapshotPosts(queryClient: QueryClient): Snapshot {
  return [
    ...queryClient.getQueriesData({ queryKey: FEED_KEY }),
    ...queryClient.getQueriesData({ queryKey: STORY_POSTS_ROOT_KEY }),
  ];
}

export function restorePosts(queryClient: QueryClient, snapshot: Snapshot | undefined): void {
  snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data));
}
