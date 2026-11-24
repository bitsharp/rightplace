import { useRouter } from 'expo-router';

import { useSession } from '@/features/auth/useSession';
import { useUnseenActivityCount } from '@/features/notifications/hooks';
import { useStories } from '@/features/map/hooks';

import { avatarPhotoFor } from '@/features/profile/avatar/avatarPhoto';
import { useAvatarUrls } from '@/features/profile/avatar/hooks';
import { useOpenFeedback } from '@/features/feedback/useOpenFeedback';

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
// `extraAvatarIds` lets a screen add its own people (e.g. the friends map) to the same batch request.
export function useTopBar(extraAvatarIds: readonly string[] = []) {
  const router = useRouter();
  const { profile, userId } = useSession();
  const target = usePostTarget();
  const stories = useStories();
  const mine = useStoryPosts(userId ?? '');
  const seenKeys = useSeenStories((state) => state.seen);
  const unseenActivity = useUnseenActivityCount();
  const onOpenFeedback = useOpenFeedback();
  const handle = profile?.handle ?? '';
  const entries = stories.data ?? [];
  // One request for my photo and everyone in the strip: only the ones I may see come back.
  const avatars = useAvatarUrls([
    userId,
    ...entries.map((entry) => entry.userId),
    ...extraAvatarIds,
  ]);

  return {
    handle,
    myPhoto: avatarPhotoFor(avatars, userId),
    // The whole batch, for the screen that asked for extra ids.
    avatarUrls: avatars,
    canPost: canPost(target.data),
    // the bell: new stories, or likes, comments and follow requests I have not opened yet
    hasNews: unseenActivity > 0 || entries.some((entry) => isUnseen(entry, seenKeys)),
    stories: buildTopBarStories({
      me: { userId: userId ?? '', handle },
      myLatestPostAt: latestVisibleFrom(mine.data),
      entries,
      seenKeys,
    }).map((story) => {
      const photo = avatarPhotoFor(avatars, story.mine ? userId : story.id);
      return photo ? { ...story, photo } : story;
    }),
    onPost: () => router.push('/post/new'),
    onOpenProfile: () => router.push('/profile'),
    onOpenNews: () => router.push('/activity'),
    onOpenFeedback: () => void onOpenFeedback(),
    onOpenStory: (id: string) =>
      router.push({
        pathname: '/story/[userId]',
        params: { userId: id === 'me' ? (userId ?? '') : id },
      }),
  };
}
