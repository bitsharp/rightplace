import { useLocalSearchParams } from 'expo-router';

import { EditEventScreen } from '@/features/creator/screens/EditEventScreen';

export default function EditEventRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <EditEventScreen eventId={id} />;
}
