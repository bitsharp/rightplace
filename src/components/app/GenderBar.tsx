import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';

type Props = {
  femalePct: number;
  malePct: number;
};

const clampPct = (value: number, max: number) => Math.min(Math.max(Math.round(value), 0), max);

// Percentages come from a k≥3 aggregate (CLAUDE.md principle 2); the bar only draws them.
export function GenderBar({ femalePct, malePct }: Props) {
  const { t } = useTranslation('ui');
  const female = clampPct(femalePct, 100);
  const male = clampPct(malePct, 100 - female);

  return (
    <Card style={styles.card}>
      <Text variant="body14" color="textSecondary">
        {t('gender.title')}
      </Text>
      <View
        accessible
        accessibilityRole="image"
        accessibilityLabel={t('gender.a11y', { female, male })}
        style={styles.track}
      >
        <View
          testID="gender-female"
          style={[styles.segment, { width: `${female}%`, backgroundColor: colors.female }]}
        />
        <View
          testID="gender-male"
          style={[styles.segment, { width: `${male}%`, backgroundColor: colors.male }]}
        />
      </View>
      <View style={styles.legend}>
        <LegendItem color={colors.female} label={t('gender.female', { pct: female })} />
        <LegendItem color={colors.male} label={t('gender.male', { pct: male })} />
      </View>
    </Card>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.swatch, { backgroundColor: color }]} />
      <Text variant="body14">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm + 2 },
  track: {
    flexDirection: 'row',
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
    backgroundColor: colors.border,
  },
  segment: { height: 14 },
  legend: { flexDirection: 'row', justifyContent: 'space-between' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  swatch: { width: 10, height: 10, borderRadius: 5 },
});
