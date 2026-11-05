import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { useFeed, usePostPhotoUrls, useToggleLike } from './hooks';
import type { PostNotice } from './components/PostActionsSheet';
import type { FeedPost } from './domain/types';

const NOTICE_MS = 3000;

// Everything the feed screen needs: the paged list, signed photo URLs, likes and the two sheets.
export function useFeedScreen() {
  const router = useRouter();
  const feed = useFeed();
  const toggleLike = useToggleLike();
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [actionsFor, setActionsFor] = useState<FeedPost | null>(null);
  const [notice, setNotice] = useState<PostNotice | null>(null);
  const photoIds = feed.posts.filter((post) => post.hasPhoto).map((post) => post.id);
  const photoUrls = usePostPhotoUrls(photoIds);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(timer);
  }, [notice]);

  return {
    feed,
    photoUrls,
    commentsFor,
    openComments: setCommentsFor,
    actionsFor,
    openActions: setActionsFor,
    notice,
    setNotice,
    toggleLike: (post: FeedPost) => toggleLike.mutate({ postId: post.id, liked: !post.likedByMe }),
    followMore: () => router.push('/friends'),
  };
}
