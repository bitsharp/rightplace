import { z } from 'zod';

import { callRpc } from '@/lib/callRpc';
import { RpcError, toRpcErrorCode } from '@/lib/rpcError';
import { supabase } from '@/lib/supabase';

import type { FeedCursor, FeedPost, PostComment, PostTarget } from './domain/types';

export const FEED_PAGE_SIZE = 20;
export const COMMENTS_PAGE_SIZE = 30;

const targetSchema = z.object({
  night_id: z.string().nullable(),
  event_id: z.string().nullable(),
  venue_name: z.string(),
  night_date: z.string().nullable(),
  room_id: z.string().nullable(),
});

const postSchema = z.object({
  post_id: z.string(),
  author_id: z.string(),
  author_handle: z.string(),
  venue_name: z.string().nullable(),
  night_date: z.string().nullable(),
  caption: z.string().nullable(),
  has_photo: z.boolean(),
  visible_from: z.string(),
  expires_at: z.string(),
  like_count: z.number().int(),
  comment_count: z.number().int(),
  liked_by_me: z.boolean(),
  is_mine: z.boolean(),
});

const createdSchema = z.object({
  post_id: z.string(),
  visible_from: z.string(),
  expires_at: z.string(),
});
const likeSchema = z.object({ like_count: z.number().int(), liked_by_me: z.boolean() });
const commentSchema = z.object({
  comment_id: z.string(),
  user_id: z.string(),
  handle: z.string(),
  text: z.string(),
  created_at: z.string(),
  is_mine: z.boolean(),
  can_delete: z.boolean(),
});
const addedSchema = z.object({ comment_id: z.string(), created_at: z.string() });
const photoUrlsSchema = z.object({
  urls: z.array(z.object({ postId: z.string(), url: z.string() })),
});

function toPost(row: z.infer<typeof postSchema>): FeedPost {
  return {
    id: row.post_id,
    authorId: row.author_id,
    authorHandle: row.author_handle,
    venueName: row.venue_name,
    nightDate: row.night_date,
    caption: row.caption,
    hasPhoto: row.has_photo,
    visibleFrom: row.visible_from,
    expiresAt: row.expires_at,
    likeCount: row.like_count,
    commentCount: row.comment_count,
    likedByMe: row.liked_by_me,
    isMine: row.is_mine,
  };
}

function firstRow<T>(rows: T[]): T {
  const [row] = rows;
  if (!row) throw new RpcError('UNKNOWN');
  return row;
}

// The canPost rule: a declaration that is active or ended less than 24 h ago (decided by the server).
export async function fetchPostTarget(): Promise<PostTarget | null> {
  const [row] = z.array(targetSchema).parse(await callRpc<unknown>('get_post_target'));
  if (!row) return null;
  return {
    nightId: row.night_id,
    eventId: row.event_id,
    venueName: row.venue_name,
    nightDate: row.night_date,
    roomId: row.room_id,
  };
}

export type NewPost = { caption?: string; photoPath?: string; chatPhotoPath?: string };

// Files are uploaded before this call (path <user id>/<uuid>.jpg); the server checks both paths.
export async function createPost(post: NewPost) {
  const rows = z.array(createdSchema).parse(
    await callRpc<unknown>('create_post', {
      p_caption: post.caption?.trim() || null,
      p_photo_path: post.photoPath ?? null,
      p_chat_photo_path: post.chatPhotoPath ?? null,
    }),
  );
  const created = firstRow(rows);
  return {
    postId: created.post_id,
    visibleFrom: created.visible_from,
    expiresAt: created.expires_at,
  };
}

// Only the caller's posts and those of accepted follows inside their window (principle 6, server side).
export async function fetchFeedPage(cursor?: FeedCursor): Promise<FeedPost[]> {
  const rows = z.array(postSchema).parse(
    await callRpc<unknown>('get_feed', {
      p_before_visible: cursor?.beforeVisible ?? null,
      p_before_id: cursor?.beforeId ?? null,
      p_limit: FEED_PAGE_SIZE,
    }),
  );
  return rows.map(toPost);
}

export async function fetchStoryPosts(userId: string): Promise<FeedPost[]> {
  const rows = z
    .array(postSchema)
    .parse(await callRpc<unknown>('get_story_posts', { p_user_id: userId }));
  return rows.map(toPost);
}

export async function setPostLike(postId: string, liked: boolean) {
  const rows = z
    .array(likeSchema)
    .parse(await callRpc<unknown>('set_post_like', { p_post_id: postId, p_liked: liked }));
  const result = firstRow(rows);
  return { likeCount: result.like_count, likedByMe: result.liked_by_me };
}

// Newest first, like the server; the sheet reverses them for reading.
export async function fetchComments(postId: string, before?: string): Promise<PostComment[]> {
  const rows = z.array(commentSchema).parse(
    await callRpc<unknown>('get_post_comments', {
      p_post_id: postId,
      p_before: before ?? null,
      p_limit: COMMENTS_PAGE_SIZE,
    }),
  );
  return rows.map((row) => ({
    id: row.comment_id,
    userId: row.user_id,
    handle: row.handle,
    text: row.text,
    createdAt: row.created_at,
    isMine: row.is_mine,
    canDelete: row.can_delete,
  }));
}

export async function addComment(postId: string, text: string) {
  const rows = z
    .array(addedSchema)
    .parse(await callRpc<unknown>('add_post_comment', { p_post_id: postId, p_text: text }));
  const added = firstRow(rows);
  return { id: added.comment_id, createdAt: added.created_at };
}

export async function deleteComment(commentId: string): Promise<void> {
  await callRpc<unknown>('delete_post_comment', { p_comment_id: commentId });
}

export async function deletePost(postId: string): Promise<void> {
  await callRpc<unknown>('delete_post', { p_post_id: postId });
}

// Moderation (principle 7): reports go to moderators only; the author is never told who reported.
const report = (kind: 'post' | 'comment', id: string) =>
  callRpc<unknown>('report', { p_target_kind: kind, p_target_id: id, p_reason: null });

export const reportPost = async (postId: string): Promise<void> =>
  void (await report('post', postId));
export const reportComment = async (commentId: string): Promise<void> =>
  void (await report('comment', commentId));

// Photos have no public URL: the Edge Function signs (1 h) only what the database says the caller may see.
export async function fetchPostPhotoUrls(postIds: string[]): Promise<Record<string, string>> {
  if (postIds.length === 0) return {};
  const { data, error } = await supabase.functions.invoke('post-photo-urls', {
    body: { postIds },
  });
  if (error) throw new RpcError(toRpcErrorCode(error));
  const parsed = photoUrlsSchema.parse(data);
  return Object.fromEntries(parsed.urls.map(({ postId, url }) => [postId, url]));
}
