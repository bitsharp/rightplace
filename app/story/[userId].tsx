import { useLocalSearchParams } from 'expo-router';

import { StoryViewerScreen } from '@/features/posts/screens/StoryViewerScreen';

export default function StoryRoute() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  return <StoryViewerScreen userId={userId ?? ''} />;
}
