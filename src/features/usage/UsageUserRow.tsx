import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { spacing } from '@/theme/tokens';

import { formatMinutes, formatSince } from './domain/format';
import type { UsageUser } from './domain/types';

type Props = { user: UsageUser; now: Date; onOpen: (user: UsageUser) => void };

// One user of the overview: handle and initial only (the admin is not necessarily "linked": no photo).
export function UsageUserRow({ user, now, onOpen }: Props) {
  const { t, i18n } = useTranslation('admin');
  const device = [user.lastPlatform, user.lastAppVersion].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('usage.openUser', { handle: formatHandle(user.handle) })}
      onPress={() => onOpen(user)}
    >
      <Card style={styles.card}>
        <Avatar intent="neutral" initial={user.handle.charAt(0).toUpperCase()} size={44} />
        <View style={styles.body}>
          <Text variant="body14Medium">{formatHandle(user.handle)}</Text>
          <Text variant="body12" color="textSecondary">
            {t('usage.lastSeen', { when: formatSince(user.lastSeenAt, now, i18n.language) })}
          </Text>
          <Text variant="body12" color="textSecondary">
            {t('usage.logins', { count: user.logins })}
          </Text>
          <Text variant="body12" color="textSecondary">
            {t('usage.sessions', { count: user.sessions })}
          </Text>
          <Text variant="body12" color="textSecondary">
            {t('usage.totalTime', { time: formatMinutes(user.totalMinutes, i18n.language) })}
          </Text>
          <Text variant="body12" color="textSecondary">
            {device}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, flexDirection: 'row', gap: spacing.lg, alignItems: 'center' },
  body: { flex: 1, gap: spacing.xs },
});
