import { useRouter } from 'expo-router';

import { useSession } from '@/features/auth/useSession';
import { useStories } from '@/features/map/hooks';

import { canPost } from './domain/canPost';
import { isUnseen } from './domain/stories';
import { buildTopBarStories } from './domain/topBarStories';
import { usePostTarget, useStoryPosts } from './hooks';
import { useSeenStories } from './store/seenStories';

// Latest post of mine in the last 24 h: the server only returns those (get_story_posts).
const latestVisibleFrom = (posts: readonly { visibleFrom: string }[] | undefined): string | null =>
  posts?.reduce<string | null>(
    (latest, post) => (latest === null || post.visibleFrom > latest ? post.visibleFrom : latest),
    null,
  ) ?? null;

// One TopBar for every tab: handle, "+" (only with a recent declaration), news bell and stories.
export function useTopBar() {
  const router = useRouter();
  const { profile, userId } = useSession();
  const target = usePostTarget();
  const stories = useStories();
  const mine = useStoryPosts(userId ?? '');
  const seenKeys = useSeenStories((state) => state.seen);
  const handle = profile?.handle ?? '';
  const entries = stories.data ?? [];

  return {
    handle,
    canPost: canPost(target.data),
    hasNews: entries.some((entry) => isUnseen(entry, seenKeys)),
    stories: buildTopBarStories({
      me: { userId: userId ?? '', handle },
      myLatestPostAt: latestVisibleFrom(mine.data),
      entries,
      seenKeys,
    }),
    onPost: () => router.push('/post/new'),
    onOpenProfile: () => router.push('/profile'),
    onOpenNews: () => router.push('/feed'),
    onOpenStory: (id: string) =>
      router.push({
        pathname: '/story/[userId]',
        params: { userId: id === 'me' ? (userId ?? '') : id },
      }),
  };
}
