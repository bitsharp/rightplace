import type { FeedPost } from './types';

// Optimistic update for the like toggle; the server answer replaces it.
export function applyLike(post: FeedPost, liked: boolean): FeedPost {
  if (post.likedByMe === liked) return post;
  return { ...post, likedByMe: liked, likeCount: Math.max(0, post.likeCount + (liked ? 1 : -1)) };
}
