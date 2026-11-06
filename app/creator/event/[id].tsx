import { useLocalSearchParams } from 'expo-router';

import { CreatorEventScreen } from '@/features/creator/screens/CreatorEventScreen';

export default function CreatorEventRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CreatorEventScreen eventId={id} />;
}
