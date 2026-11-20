import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { usePhotoViewerState } from '@/components/app/usePhotoViewerState';

import { useOpenProfile } from '@/features/profile/useOpenProfile';
import { useAvatarUrls } from '@/features/profile/avatar/hooks';

import { useFeed, usePostPhotoUrls, useToggleLike } from './hooks';
import type { PostNotice } from './components/PostActionsSheet';
import type { FeedPost } from './domain/types';

const NOTICE_MS = 3000;

// Everything the feed screen needs: the paged list, signed photo URLs, likes and the two sheets.
export function useFeedScreen() {
  const router = useRouter();
  const openProfile = useOpenProfile();
  const feed = useFeed();
  const toggleLike = useToggleLike();
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [actionsFor, setActionsFor] = useState<FeedPost | null>(null);
  const [notice, setNotice] = useState<PostNotice | null>(null);
  const photoIds = feed.posts.filter((post) => post.hasPhoto).map((post) => post.id);
  const photoUrls = usePostPhotoUrls(photoIds);
  // One request for every author of the loaded pages; the server only signs the photos I may see.
  const avatarUrls = useAvatarUrls(feed.posts.map((post) => post.authorId));
  // The viewer scrolls through the photos of the posts loaded so far, in feed order.
  const viewer = usePhotoViewerState(
    photoIds.map((id) => ({ id, uri: photoUrls[id], cacheKey: id, scene: id.charCodeAt(0) })),
  );

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  return {
    feed,
    photoUrls,
    avatarUrls,
    viewer,
    commentsFor,
    openComments: setCommentsFor,
    actionsFor,
    openActions: setActionsFor,
    notice,
    setNotice,
    toggleLike: (post: FeedPost) => toggleLike.mutate({ postId: post.id, liked: !post.likedByMe }),
    openAuthor: (post: FeedPost) => openProfile({ handle: post.authorHandle, isMine: post.isMine }),
    followMore: () => router.push('/friends'),
  };
}
