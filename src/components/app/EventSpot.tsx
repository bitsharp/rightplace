import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useBandLabel } from '@/components/ui/useBandLabel';
import {
  dominantIntent,
  hotSpotDiameter,
  type Band,
  type Intent,
} from '@/features/nights/domain/band';
import { colors, fonts, glow } from '@/theme/tokens';

type Props = {
  name: string;
  goingBand: Band;
  maybeBand: Band;
  onPress: () => void;
};

const INTENT_STYLE: Record<
  Intent,
  { borderColor: string; backgroundColor: string; shadowColor: string }
> = {
  going: {
    borderColor: colors.going,
    backgroundColor: colors.goingTint,
    shadowColor: colors.going,
  },
  maybe: {
    borderColor: colors.maybe,
    backgroundColor: colors.maybeTint,
    shadowColor: colors.maybe,
  },
};

// A creator's night on the map: same colour language as HotSpot ("stasera" layer, principle 11) but a
// dashed border and a lighter fill, so it is never mistaken for the venue's own hot spot.
// No sponsored emphasis here: sponsorship is prompt 13.
export function EventSpot({ name, goingBand, maybeBand, onPress }: Props) {
  const { t } = useTranslation('ui');
  const bandLabel = useBandLabel();
  const main = dominantIntent(goingBand, maybeBand);
  const diameter = hotSpotDiameter(main === 'going' ? goingBand : maybeBand);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('eventSpot.a11y', {
        event: name,
        going: bandLabel(goingBand),
        maybe: bandLabel(maybeBand),
      })}
      onPress={onPress}
      style={[styles.center, { width: diameter, height: diameter }]}
    >
      <View
        testID="event-spot-outer"
        style={[
          styles.circle,
          styles.center,
          glow,
          INTENT_STYLE[main],
          { width: diameter, height: diameter, borderRadius: diameter / 2 },
        ]}
      >
        <Text variant="label12" style={styles.label}>
          {bandLabel(goingBand)}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  circle: { borderWidth: 2, borderStyle: 'dashed' },
  label: { fontFamily: fonts.monoBold, color: colors.text },
});
