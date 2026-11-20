import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { spacing } from '@/theme/tokens';

import type { FollowStatus } from '../domain/followButton';

// What a stranger (or a pending request) sees instead of the posts: the grid is only for accepted followers.
export function PrivateProfileCard({
  handle,
  followState,
}: {
  handle: string;
  followState: FollowStatus;
}) {
  const { t } = useTranslation('friends');
  return (
    <Card tone="dashed" style={styles.card}>
      <Icon name="eyeOff" size={28} color="textSecondary" />
      <Text variant="body15Strong">{t('publicProfile.privateTitle')}</Text>
      <Text variant="body13" color="textSecondary" style={styles.body}>
        {followState === 'pending'
          ? t('publicProfile.privateRequested')
          : t('publicProfile.privateBody', { handle: formatHandle(handle) })}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl, marginTop: spacing.lg },
  body: { textAlign: 'center' },
});
