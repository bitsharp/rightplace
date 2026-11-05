import { useRouter } from 'expo-router';
import { useEffect } from 'react';

import { useSession } from '@/features/auth/useSession';
import { useStories } from '@/features/map/hooks';

import { storyKey } from './domain/stories';
import { usePostPhotoUrls, useStoryPosts } from './hooks';
import { useSeenStories } from './store/seenStories';

// The key must be the one the TopBar ring uses: the server's latest_post_at for other people
// (get_stories), the newest visible_from of my own posts for "La tua storia".
function useStoryKey(userId: string, myPosts: readonly { visibleFrom: string }[] | undefined) {
  const { userId: me } = useSession();
  const stories = useStories();
  if (userId === me) {
    const latest = myPosts
      ?.map((post) => post.visibleFrom)
      .sort()
      .at(-1);
    return latest ? storyKey(userId, latest) : null;
  }
  const entry = stories.data?.find((story) => story.userId === userId);
  return entry ? storyKey(userId, entry.latestPostAt) : null;
}

export function useStoryViewer(userId: string) {
  const router = useRouter();
  const posts = useStoryPosts(userId);
  const key = useStoryKey(userId, posts.data);
  const markSeen = useSeenStories((state) => state.markSeen);
  const photoIds = (posts.data ?? []).filter((post) => post.hasPhoto).map((post) => post.id);
  const photoUrls = usePostPhotoUrls(photoIds);
  const loaded = posts.isSuccess && posts.data.length > 0;

  // Opening the story is what marks it as seen (local only).
  useEffect(() => {
    if (loaded && key) markSeen(key);
  }, [loaded, key, markSeen]);

  return {
    posts: posts.data ?? [],
    isLoading: posts.isLoading,
    isError: posts.isError,
    photoUrls,
    close: () => (router.canGoBack() ? router.back() : router.replace('/feed')),
  };
}
