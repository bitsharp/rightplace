import { useLocalSearchParams } from 'expo-router';

import { NightChatScreen } from '@/features/chat/screens/NightChatScreen';

export default function NightChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NightChatScreen roomId={id} />;
}
