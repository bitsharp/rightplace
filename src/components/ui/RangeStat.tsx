import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import type { Band, Intent } from '@/features/nights/domain/band';
import { spacing } from '@/theme/tokens';

import { Card } from './Card';
import { MonoLabel } from './MonoLabel';
import { Text } from './Text';
import { useBandLabel } from './useBandLabel';

type Props = {
  intent: Intent;
  band: Band;
};

export function RangeStat({ intent, band }: Props) {
  const { t } = useTranslation('ui');
  const bandLabel = useBandLabel();
  return (
    <Card style={styles.card}>
      <MonoLabel tone={intent} size="medium">
        {t(`intent.${intent}`)}
      </MonoLabel>
      <Text variant="display24">{bandLabel(band)}</Text>
      <Text variant="body12" color="textSecondary">
        {t('people')}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({ card: { flex: 1, gap: spacing.xs } });
