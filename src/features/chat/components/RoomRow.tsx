import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { colors, radius, spacing } from '@/theme/tokens';

import type { ChatRoom } from '../api';

type Props = { room: ChatRoom; onPress: (roomId: string) => void };

function useLastLine(room: ChatRoom): string {
  const { t } = useTranslation('chat');
  if (room.lastKind === null || room.lastHandle === null) return t('list.noMessages');
  const text = room.lastKind === 'photo' ? t('list.photoMessage') : (room.lastText ?? '');
  return t('list.lastMessage', { handle: formatHandle(room.lastHandle), text });
}

export function RoomRow({ room, onPress }: Props) {
  const { t } = useTranslation('chat');
  const lastLine = useLastLine(room);
  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(room.roomId)} style={styles.row}>
      <View style={styles.body}>
        <Text variant="display17" numberOfLines={1}>
          {room.eventName ?? room.venueName}
        </Text>
        <MonoLabel tone="going">{t('list.friendsInside', { count: room.friendsInside })}</MonoLabel>
        <Text variant="body13" color="textSecondary" numberOfLines={1}>
          {lastLine}
        </Text>
      </View>
      <Icon name="chevronRight" color="textSecondary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  body: { flex: 1, gap: spacing.xs },
});
