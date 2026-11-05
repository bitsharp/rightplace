import { useRouter } from 'expo-router';

import { buildTopBarStories } from '@/features/map/domain/stories';
import { useMyDeclaration, useStories } from '@/features/map/hooks';
import { useSession } from '@/features/auth/useSession';

// Same TopBar as the map (handle, "+", news, stories), fed by the same cached queries.
export function useFriendsTopBar() {
  const router = useRouter();
  const { profile } = useSession();
  const declaration = useMyDeclaration();
  const stories = useStories();
  const handle = profile?.handle ?? '';
  return {
    handle,
    canPost: declaration.data != null,
    hasNews: (stories.data ?? []).length > 0,
    stories: buildTopBarStories(handle, stories.data ?? []),
    onPost: () => router.push('/post/new'),
    onOpenProfile: () => router.push('/profile'),
    onOpenNews: () => router.push('/feed'),
    onOpenStory: () => router.push('/feed'),
  };
}
