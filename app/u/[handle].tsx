import { useLocalSearchParams } from 'expo-router';

import { PublicProfileScreen } from '@/features/friends/screens/PublicProfileScreen';

export default function PublicProfileRoute() {
  const { handle } = useLocalSearchParams<{ handle: string }>();
  return <PublicProfileScreen handle={handle} />;
}
