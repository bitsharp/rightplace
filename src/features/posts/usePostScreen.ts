import { useEffect, useState } from 'react';

import { usePhotoViewerState } from '@/components/app/usePhotoViewerState';
import { useAvatarUrls } from '@/features/profile/avatar/hooks';
import { useOpenProfile } from '@/features/profile/useOpenProfile';

import type { PostNotice } from './components/PostActionsSheet';
import type { FeedPost } from './domain/types';
import { usePost, usePostLikers, usePostPhotoUrls, useToggleLike } from './hooks';

const NOTICE_MS = 3000;

// Everything the single-post page needs: the post, its signed photo, likes, the two sheets and, for the author
// only, the list of who liked it (the server refuses anyone else, so we do not even ask).
export function usePostScreen(postId: string, openComments: boolean) {
  const openProfile = useOpenProfile();
  const query = usePost(postId);
  const post = query.data ?? null;
  const toggleLike = useToggleLike();
  const [commentsOpen, setCommentsOpen] = useState(openComments);
  const [actionsFor, setActionsFor] = useState<FeedPost | null>(null);
  const [notice, setNotice] = useState<PostNotice | null>(null);
  const photoIds = post?.hasPhoto ? [post.id] : [];
  const photoUrls = usePostPhotoUrls(photoIds);
  const likers = usePostLikers(postId, post?.isMine === true);
  const avatarUrls = useAvatarUrls([post?.authorId, ...(likers.data ?? []).map((l) => l.userId)]);
  const viewer = usePhotoViewerState(
    photoIds.map((id) => ({ id, uri: photoUrls[id], cacheKey: id, scene: id.charCodeAt(0) })),
  );

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  return {
    post,
    isLoading: query.isLoading,
    isError: query.isError,
    photoUrls,
    avatarUrls,
    viewer,
    likers,
    commentsOpen,
    setCommentsOpen,
    actionsFor,
    openActions: setActionsFor,
    notice,
    setNotice,
    toggleLike: (target: FeedPost) =>
      toggleLike.mutate({ postId: target.id, liked: !target.likedByMe }),
    openAuthor: (target: FeedPost) =>
      openProfile({ handle: target.authorHandle, isMine: target.isMine }),
    openLiker: (handle: string) => openProfile({ handle, isMine: false }),
  };
}
