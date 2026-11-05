import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radius, spacing, type ColorToken } from '@/theme/tokens';

import { typicalLabelKey, type VisibleTypicalLevel } from '../domain/typical';

type Entry = { key: string; label: string; dot: { color?: ColorToken; size?: number } };

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

function LegendBlock({ title, entries }: { title: string; entries: Entry[] }) {
  return (
    <View style={styles.block}>
      <Text variant="label10" color="textSecondary" numberOfLines={1} style={styles.title}>
        {title}
      </Text>
      <View testID="legend-items" style={styles.items}>
        {entries.map(({ key, label, dot }) => (
          <View key={key} style={styles.item}>
            <View
              testID={dot.color ? undefined : 'legend-typical-dot'}
              style={[
                styles.dot,
                dot.color ? { backgroundColor: colors[dot.color] } : styles.typical,
                dot.size ? { width: dot.size, height: dot.size } : null,
              ]}
            />
            <Text variant="label11" color="textSecondary" numberOfLines={1}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Two blocks on purpose: the coloured "stasera" layer and the grey "di solito" layer never mix.
// No fixed widths: labels and items wrap whatever the language or the screen width.
export function MapLegend() {
  const { t } = useTranslation('map');
  const tonight = TONIGHT.map(({ labelKey, color }) => ({
    key: labelKey,
    label: t(`ui:${labelKey}`),
    dot: { color },
  }));
  const usually = USUALLY_LEVELS.map(({ level, size }) => ({
    key: String(level),
    label: t(`ui:typical.${typicalLabelKey(level)}`),
    dot: { size },
  }));
  return (
    <View testID="map-legend" style={styles.box}>
      <LegendBlock title={t('legend.tonight')} entries={tonight} />
      <LegendBlock title={t('legend.usually')} entries={usually} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.segmented,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.overlay,
  },
  block: { gap: spacing.xs },
  title: { textTransform: 'uppercase' },
  items: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md, rowGap: spacing.xs },
  item: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2, flexShrink: 1 },
  dot: { width: 10, height: 10, borderRadius: 999 },
  typical: { backgroundColor: colors.typicalDot },
});
