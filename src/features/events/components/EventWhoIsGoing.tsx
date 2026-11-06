import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { Breakdown } from '@/features/venue/components/WhoIsGoing';
import type { StatsView } from '@/features/venue/domain/statsState';
import { spacing } from '@/theme/tokens';

// Same k-anonymity rule as the venue page, for the single group of people who declared this night.
export function EventWhoIsGoing({ view }: { view: StatsView | null }) {
  const { t } = useTranslation('venue');
  return (
    <View style={styles.block}>
      <View style={styles.titleRow}>
        <Text variant="display17">{t('who.title')}</Text>
        <MonoLabel>{t('who.label')}</MonoLabel>
      </View>
      <Breakdown view={view} />
      <Text variant="body12" color="textSecondary">
        {t('who.basis')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
