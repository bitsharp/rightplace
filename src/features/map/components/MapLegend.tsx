import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, radius, spacing, type ColorToken } from '@/theme/tokens';

type Entry = {
  key: string;
  label: string;
  dot: { color?: ColorToken; dashed?: boolean; square?: boolean };
};

const TONIGHT: { labelKey: 'intent.going' | 'intent.maybe' | 'you'; color: ColorToken }[] = [
  { labelKey: 'intent.going', color: 'going' },
  { labelKey: 'intent.maybe', color: 'maybe' },
  { labelKey: 'you', color: 'text' },
];

function dotTestId(dot: Entry['dot']): string | undefined {
  if (dot.dashed) return 'legend-event-dot';
  if (dot.square) return 'legend-spot-dot';
  return undefined;
}

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
              testID={dotTestId(dot)}
              style={[
                styles.dot,
                dot.color ? { backgroundColor: colors[dot.color] } : null,
                dot.dashed ? styles.dashed : null,
                dot.square ? styles.square : null,
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

// Only the coloured "stasera" layer: the grey "di solito" dots are not drawn any more.
// No fixed widths: labels and items wrap whatever the language or the screen width.
export function MapLegend() {
  const { t } = useTranslation('map');
  const tonight = TONIGHT.map(({ labelKey, color }) => ({
    key: labelKey,
    label: t(`ui:${labelKey}`),
    dot: { color },
  }));
  // A creator's night: the same "stasera" colours, with the dashed outline used on the map.
  const withEvent: Entry[] = [
    ...tonight,
    { key: 'event', label: t('legend.event'), dot: { dashed: true } },
    // A declared point that is not a hot spot yet: cyan rounded square, the shape of its marker.
    { key: 'spot', label: t('legend.spot'), dot: { color: 'maybe', square: true } },
  ];
  return (
    <View testID="map-legend" style={styles.box}>
      <LegendBlock title={t('legend.tonight')} entries={withEvent} />
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
  square: { borderRadius: 3 },
  dashed: {
    backgroundColor: colors.goingTint,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.going,
  },
});
