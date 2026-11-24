import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, type AvatarPhoto } from '@/components/ui/Avatar';
import { Text } from '@/components/ui/Text';
import { avatarIntent } from '@/features/friends/domain/avatarColor';
import { formatHandle } from '@/features/profile/domain/handle';
import { colors, radius, spacing } from '@/theme/tokens';

import type { DmThread } from '../api';

type Props = { thread: DmThread; avatarPhoto?: AvatarPhoto; onPress: (thread: DmThread) => void };

const formatWhen = (iso: string, language: string): string => {
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(
    language,
    sameDay ? { hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short' },
  ).format(date);
};

export function DmRow({ thread, avatarPhoto, onPress }: Props) {
  const { t, i18n } = useTranslation('dm');
  const handle = formatHandle(thread.otherHandle);
  return (
    <Pressable accessibilityRole="button" onPress={() => onPress(thread)} style={styles.row}>
      <Avatar
        intent={avatarIntent(thread.otherHandle)}
        initial={handle.charAt(1)}
        size={44}
        photo={avatarPhoto}
      />
      <View style={styles.body}>
        <Text variant="display17" numberOfLines={1}>
          {handle}
        </Text>
        <Text variant="body13" color="textSecondary" numberOfLines={1}>
          {thread.lastSenderIsMe ? t('inbox.you', { text: thread.lastText }) : thread.lastText}
        </Text>
      </View>
      <View style={styles.meta}>
        <Text variant="label10" color="textSecondary">
          {formatWhen(thread.lastMessageAt, i18n.language)}
        </Text>
        {thread.unread ? (
          <View testID="dm-unread-dot" accessibilityLabel={t('inbox.unread')} style={styles.dot} />
        ) : null}
      </View>
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
  meta: { alignItems: 'flex-end', gap: spacing.sm },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.going },
});
