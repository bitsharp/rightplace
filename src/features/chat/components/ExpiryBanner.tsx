import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = { hours: number | null };

// Principle 5, said out loud: the chat deletes itself. The countdown appears only in the last 12 hours.
export function ExpiryBanner({ hours }: Props) {
  const { t } = useTranslation('chat');
  return (
    <View style={styles.banner}>
      <Text variant="body13" color="textSecondary">
        {t('info')}
      </Text>
      {hours !== null ? (
        <MonoLabel tone="maybe">{t('expiresIn', { count: hours })}</MonoLabel>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
