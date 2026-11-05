import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { rowStyles } from '@/components/app/VenueRow';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { useBlockedUsers, useUnblockUser } from '@/features/friends/hooks';
import { spacing } from '@/theme/tokens';

import { formatHandle } from '../domain/handle';

export function BlockedSection() {
  const { t } = useTranslation('profile');
  const blocked = useBlockedUsers();
  const unblock = useUnblockUser();
  if (!blocked.data) return null;
  return (
    <View style={styles.section}>
      <MonoLabel tone="maybe">{t('blocked.title')}</MonoLabel>
      {blocked.data.length === 0 ? <EmptyState message={t('blocked.empty')} /> : null}
      {blocked.data.map((person) => {
        const handle = formatHandle(person.handle);
        return (
          <View key={person.userId} style={rowStyles.row}>
            <Text variant="body15Strong" style={styles.handle}>
              {handle}
            </Text>
            <Button
              label={t('blocked.unblock')}
              accessibilityLabel={t('blocked.a11yUnblock', { handle })}
              variant="ghost"
              size="md"
              onPress={() => unblock.mutate(person.userId)}
            />
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  handle: { flex: 1 },
});
