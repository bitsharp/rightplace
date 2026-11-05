import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/ui/EmptyState';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';

import { RoomRow } from '../components/RoomRow';
import { useMyChatRooms } from '../hooks';

export function ChatListScreen() {
  const { t } = useTranslation('chat');
  const router = useRouter();
  const rooms = useMyChatRooms();
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" variant="display22">
          {t('title')}
        </Text>
        {rooms.isError ? <EmptyState message={t('list.loadError')} /> : null}
        {rooms.data?.length === 0 ? <EmptyState message={t('list.empty')} /> : null}
        {rooms.data?.map((room) => (
          <RoomRow
            key={room.roomId}
            room={room}
            onPress={(roomId) =>
              router.push({ pathname: '/night/[id]/chat', params: { id: roomId } })
            }
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md },
});
