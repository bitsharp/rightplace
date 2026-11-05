import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { CHAT_MESSAGES_ROOT_KEY, CHAT_ROOMS_KEY } from '@/features/chat/keys';
import { useBlockUser } from '@/features/friends/hooks';
import { invalidateKeys } from '@/features/friends/keys';
import { confirmFeedback } from '@/lib/haptics';

import {
  addComment,
  deleteComment,
  deletePost,
  reportComment,
  reportPost,
  setPostLike,
} from './api';
import { patchPost, removePostsWhere, restorePosts, snapshotPosts, type Snapshot } from './cache';
import { applyLike } from './domain/likes';
import { commentsKey, FEED_KEY, STORIES_KEY, STORY_POSTS_ROOT_KEY } from './keys';
import { publishPost } from './publish';

const PUBLISH_INVALIDATES = [
  FEED_KEY,
  STORIES_KEY,
  STORY_POSTS_ROOT_KEY,
  CHAT_MESSAGES_ROOT_KEY,
  CHAT_ROOMS_KEY,
] as const;

// The new post appears in my own feed and story, and its photo in the night chat.
export function useCreatePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: publishPost,
    onSuccess: () => {
      confirmFeedback();
      return invalidateKeys(queryClient, PUBLISH_INVALIDATES);
    },
  });
}

type LikeVariables = { postId: string; liked: boolean };

// Optimistic on every copy of the post; the server counter then replaces the guess, and a failure
// puts everything back as it was.
export function useToggleLike() {
  const queryClient = useQueryClient();
  return useMutation<
    { likeCount: number; likedByMe: boolean },
    Error,
    LikeVariables,
    { snapshot: Snapshot }
  >({
    mutationFn: ({ postId, liked }) => setPostLike(postId, liked),
    onMutate: async ({ postId, liked }) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: FEED_KEY }),
        queryClient.cancelQueries({ queryKey: STORY_POSTS_ROOT_KEY }),
      ]);
      const snapshot = snapshotPosts(queryClient);
      patchPost(queryClient, postId, (post) => applyLike(post, liked));
      return { snapshot };
    },
    onSuccess: (result, { postId }) =>
      patchPost(queryClient, postId, (post) => ({ ...post, ...result })),
    onError: (_error, _variables, context) => restorePosts(queryClient, context?.snapshot),
  });
}

function changeCommentCount(queryClient: QueryClient, postId: string, delta: 1 | -1): void {
  patchPost(queryClient, postId, (post) => ({
    ...post,
    commentCount: Math.max(0, post.commentCount + delta),
  }));
  void queryClient.invalidateQueries({ queryKey: commentsKey(postId) });
}

export function useAddComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => addComment(postId, text),
    onSuccess: () => changeCommentCount(queryClient, postId, 1),
  });
}

export function useDeleteComment(postId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteComment,
    onSuccess: () => changeCommentCount(queryClient, postId, -1),
  });
}

export function useDeletePost() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deletePost,
    onSuccess: (_result, postId) => {
      removePostsWhere(queryClient, (post) => post.id === postId);
      return invalidateKeys(queryClient, [STORIES_KEY, STORY_POSTS_ROOT_KEY]);
    },
  });
}

export function useReportPost() {
  return useMutation({ mutationFn: (postId: string) => reportPost(postId) });
}

export function useReportComment() {
  return useMutation({ mutationFn: (commentId: string) => reportComment(commentId) });
}

// After a block the author's posts must vanish at once, not after the next refetch.
export function useBlockPostAuthor() {
  const queryClient = useQueryClient();
  const block = useBlockUser();
  return {
    isPending: block.isPending,
    mutate: (userId: string, options?: { onSuccess?: () => void }) =>
      block.mutate(userId, {
        onSuccess: () => {
          removePostsWhere(queryClient, (post) => post.authorId === userId);
          options?.onSuccess?.();
        },
      }),
  };
}
