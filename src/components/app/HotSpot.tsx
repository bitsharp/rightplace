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
import { hotSpotTier, type HotSpotTier } from '@/features/map/domain/hotSpotTier';
import { colors, fonts, glow } from '@/theme/tokens';

type Props = {
  venueName: string;
  goingBand: Band;
  maybeBand: Band;
  onPress: () => void;
  caption?: string;
  // The bands include estimated presence: only the accessibility label says so (the STIMA tag is on the cards).
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

// Brightest spots glow and are drawn in full colour; the quiet ones are smaller, dimmer and wordless.
const TIER_OPACITY: Record<HotSpotTier, number> = { high: 1, mid: 0.7, low: 0.55 };
const LOW_SCALE = 0.7;

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
  const layout = hotSpotLayout(goingBand, maybeBand);
  const { main, secondary, inner } = layout;
  // On the friends map the caption is the friends count, not a turnout: it stays readable (mid, no halo).
  const tier = caption === undefined ? hotSpotTier(goingBand, maybeBand) : 'mid';
  const diameter = tier === 'low' ? Math.round(layout.diameter * LOW_SCALE) : layout.diameter;
  const box = tier === 'high' ? Math.round(diameter * GLOW_SCALE) : diameter;
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
      {tier === 'high' ? (
        <Glow
          testID="hot-spot-glow"
          color={INTENT_STYLE[main].shadowColor}
          radius={box / 2}
          intensity={GLOW_INTENSITY}
        />
      ) : null}
      <View
        testID="hot-spot-outer"
        style={[
          styles.circle,
          styles.center,
          tier === 'high' ? glow : null,
          INTENT_STYLE[main],
          circle(diameter),
          { opacity: TIER_OPACITY[tier] },
        ]}
      >
        {inner > 0 && tier !== 'low' ? (
          <View
            testID="hot-spot-inner"
            style={[styles.circle, styles.inner, INTENT_STYLE[secondary], circle(inner)]}
          />
        ) : null}
        {tier === 'low' ? null : (
          <Text variant="label12" style={styles.label}>
            {caption ?? bandLabel(goingBand)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  circle: { borderWidth: 2 },
  inner: { position: 'absolute', right: '22%', bottom: '22%', borderWidth: 1.5, shadowOpacity: 0 },
  label: { fontFamily: fonts.monoBold, color: colors.text },
});
