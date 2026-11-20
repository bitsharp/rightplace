import { useEffect, useState } from 'react';

import { usePhotoViewerState } from '@/components/app/usePhotoViewerState';

import type { PostNotice } from './components/PostActionsSheet';
import type { FeedPost } from './domain/types';
import { usePostPhotoUrls, useUserPosts } from './hooks';

const NOTICE_MS = 3000;

// Everything a profile grid needs: the paged posts, signed thumbnails, the viewer that scrolls through the photos
// of the posts loaded so far, the caption sheet of text-only posts and the moderation sheet (long press).
export function useProfileGrid(userId: string, enabled = true) {
  const posts = useUserPosts(userId, enabled);
  const photoIds = posts.posts.filter((post) => post.hasPhoto).map((post) => post.id);
  const photoUrls = usePostPhotoUrls(photoIds);
  const viewer = usePhotoViewerState(
    photoIds.map((id) => ({ id, uri: photoUrls[id], cacheKey: id, scene: id.charCodeAt(0) })),
  );
  const [textPost, setTextPost] = useState<FeedPost | null>(null);
  const [actionsFor, setActionsFor] = useState<FeedPost | null>(null);
  const [notice, setNotice] = useState<PostNotice | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  return {
    posts,
    photoUrls,
    viewer,
    textPost,
    closeText: () => setTextPost(null),
    actionsFor,
    openActions: setActionsFor,
    notice,
    setNotice,
    openPost: (post: FeedPost) => (post.hasPhoto ? viewer.open(post.id) : setTextPost(post)),
  };
}

export type ProfileGrid = ReturnType<typeof useProfileGrid>;
