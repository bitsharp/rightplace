import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Glow } from '@/components/ui/Glow';
import { Text } from '@/components/ui/Text';
import { useBandLabel } from '@/components/ui/useBandLabel';
import {
  bandRank,
  dominantIntent,
  hotSpotDiameter,
  type Band,
  type Intent,
} from '@/features/nights/domain/band';
import { colors, fonts, glow } from '@/theme/tokens';

type Props = {
  venueName: string;
  goingBand: Band;
  maybeBand: Band;
  onPress: () => void;
  caption?: string;
  // The bands include estimated presence: a small ≈ sign says so (the full STIMA label is on the cards).
  isEstimate?: boolean;
};

const INTENT_STYLE: Record<
  Intent,
  { borderColor: string; backgroundColor: string; shadowColor: string }
> = {
  going: {
    borderColor: colors.going,
    backgroundColor: colors.goingFill,
    shadowColor: colors.going,
  },
  maybe: {
    borderColor: colors.maybe,
    backgroundColor: colors.maybeFill,
    shadowColor: colors.maybe,
  },
};

const INNER_SCALE = 0.42;
// The halo is part of the marker bitmap on Android: the box must be as big as the halo or it is cut.
const GLOW_SCALE = 1.9;
// Brighter than the base halo, as in the mock-up; the size per band stays the same.
const GLOW_INTENSITY = 1.6;

function hotSpotLayout(goingBand: Band, maybeBand: Band) {
  const main = dominantIntent(goingBand, maybeBand);
  const mainBand = main === 'going' ? goingBand : maybeBand;
  const secondaryBand = main === 'going' ? maybeBand : goingBand;
  return {
    main,
    secondary: (main === 'going' ? 'maybe' : 'going') as Intent,
    diameter: hotSpotDiameter(mainBand),
    inner:
      bandRank(secondaryBand) > 0 ? Math.round(hotSpotDiameter(secondaryBand) * INNER_SCALE) : 0,
  };
}

const circle = (size: number) => ({ width: size, height: size, borderRadius: size / 2 });

// "Stasera" layer (CLAUDE.md principle 11): coloured, sized by band, never by an exact count.
// Size and colour follow the dominant intent; the label is always the "Ci vado" band.
export function HotSpot({
  venueName,
  goingBand,
  maybeBand,
  onPress,
  caption,
  isEstimate = false,
}: Props) {
  const { t } = useTranslation('ui');
  const bandLabel = useBandLabel();
  const { main, secondary, diameter, inner } = hotSpotLayout(goingBand, maybeBand);
  const box = Math.round(diameter * GLOW_SCALE);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t(isEstimate ? 'hotSpot.a11yEstimate' : 'hotSpot.a11y', {
        venue: venueName,
        going: bandLabel(goingBand),
        maybe: bandLabel(maybeBand),
      })}
      onPress={onPress}
      style={[styles.center, { width: box, height: box }]}
    >
      <Glow
        testID="hot-spot-glow"
        color={INTENT_STYLE[main].shadowColor}
        radius={box / 2}
        intensity={GLOW_INTENSITY}
      />
      <View
        testID="hot-spot-outer"
        style={[styles.circle, styles.center, glow, INTENT_STYLE[main], circle(diameter)]}
      >
        {inner > 0 ? (
          <View
            testID="hot-spot-inner"
            style={[styles.circle, styles.inner, INTENT_STYLE[secondary], circle(inner)]}
          />
        ) : null}
        <Text variant="label12" style={styles.label}>
          {caption ?? bandLabel(goingBand)}
        </Text>
        {isEstimate ? (
          <View testID="hot-spot-estimate" style={styles.estimate}>
            <Text variant="label10" color="maybe">
              ≈
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  circle: { borderWidth: 2 },
  inner: { position: 'absolute', right: '22%', bottom: '22%', borderWidth: 1.5, shadowOpacity: 0 },
  label: { fontFamily: fonts.monoBold, color: colors.text },
  estimate: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.maybe,
    backgroundColor: colors.surface,
  },
});
