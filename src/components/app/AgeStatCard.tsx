import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';

type Props = { averageAge: number };

export function AgeStatCard({ averageAge }: Props) {
  const { t } = useTranslation('ui');
  return (
    <Card style={styles.card}>
      <Text variant="body14" color="textSecondary">
        {t('age.average')}
      </Text>
      <Text variant="display22">{t('age.years', { age: Math.round(averageAge) })}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
});
