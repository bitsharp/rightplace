import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing, type ColorToken } from '@/theme/tokens';

import { typicalLabelKey, type VisibleTypicalLevel } from '../domain/typical';

const TONIGHT: { labelKey: 'intent.going' | 'intent.maybe' | 'you'; color: ColorToken }[] = [
  { labelKey: 'intent.going', color: 'going' },
  { labelKey: 'intent.maybe', color: 'maybe' },
  { labelKey: 'you', color: 'text' },
];

const USUALLY_LEVELS: { level: VisibleTypicalLevel; size: number }[] = [
  { level: 1, size: 8 },
  { level: 2, size: 10 },
  { level: 3, size: 13 },
];

const TITLE_WIDTH = 64;

// Two rows on purpose: the coloured "stasera" layer and the grey "di solito" layer never mix.
export function MapLegend() {
  const { t } = useTranslation('map');
  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <View style={styles.title}>
          <MonoLabel>{t('legend.tonight')}</MonoLabel>
        </View>
        <View testID="legend-items" style={styles.items}>
          {TONIGHT.map(({ labelKey, color }) => (
            <View key={labelKey} style={styles.item}>
              <View style={[styles.dot, { backgroundColor: colors[color] }]} />
              <Text variant="label11" color="textSecondary">
                {t(`ui:${labelKey}`)}
              </Text>
            </View>
          ))}
        </View>
      </View>
      <View style={styles.row}>
        <View style={styles.title}>
          <MonoLabel>{t('legend.usually')}</MonoLabel>
        </View>
        <View testID="legend-items" style={styles.items}>
          {USUALLY_LEVELS.map(({ level, size }) => (
            <View key={level} style={styles.item}>
              <View
                testID="legend-typical-dot"
                style={[styles.dot, styles.typical, { width: size, height: size }]}
              />
              <Text variant="label11" color="textSecondary">
                {t(`ui:typical.${typicalLabelKey(level)}`)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.segmented,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.overlay,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  title: { width: TITLE_WIDTH, paddingTop: 1 },
  items: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: spacing.md,
    rowGap: spacing.xs,
  },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  dot: { width: 10, height: 10, borderRadius: 999 },
  typical: { backgroundColor: colors.typicalDot },
});
