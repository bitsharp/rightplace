import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/app/TopBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { DmInbox } from '@/features/dm/components/DmInbox';
import { useTopBar } from '@/features/posts/useTopBar';
import { TourAnchor } from '@/features/tour/components/TourAnchor';
import { TourOverlay } from '@/features/tour/components/TourOverlay';
import { colors, spacing } from '@/theme/tokens';

import { RoomRow } from '../components/RoomRow';
import { useMyChatRooms } from '../hooks';

type Section = 'nights' | 'messages';

export function ChatListScreen() {
  const { t } = useTranslation('chat');
  const { t: tDm } = useTranslation('dm');
  const router = useRouter();
  const rooms = useMyChatRooms();
  const topBar = useTopBar();
  const [section, setSection] = useState<Section>('nights');
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <TopBar {...topBar} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" variant="display22">
          {t('title')}
        </Text>
        <TourAnchor id="chat.night">
          <SegmentedControl
            options={[
              { value: 'nights', label: tDm('tabs.nights'), tone: 'going' },
              { value: 'messages', label: tDm('tabs.messages'), tone: 'going' },
            ]}
            value={section}
            onChange={setSection}
          />
        </TourAnchor>
        {section === 'messages' ? <DmInbox /> : null}
        {section === 'nights' && rooms.isError ? (
          <EmptyState message={t('list.loadError')} />
        ) : null}
        {section === 'nights' && rooms.data?.length === 0 ? (
          <EmptyState message={t('list.empty')} />
        ) : null}
        {section === 'nights'
          ? rooms.data?.map((room) => (
              <RoomRow
                key={room.roomId}
                room={room}
                onPress={(roomId) =>
                  router.push({ pathname: '/night/[id]/chat', params: { id: roomId } })
                }
              />
            ))
          : null}
      </ScrollView>
      <TourOverlay screen="chat" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.xl, gap: spacing.md },
});
