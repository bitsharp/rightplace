import { useLocalSearchParams } from 'expo-router';

import { DmThreadScreen } from '@/features/dm/screens/DmThreadScreen';

export default function DmThreadRoute() {
  const { threadId, handle, userId } = useLocalSearchParams<{
    threadId: string;
    handle?: string;
    userId?: string;
  }>();
  return <DmThreadScreen threadId={threadId} handle={handle} userId={userId} />;
}
