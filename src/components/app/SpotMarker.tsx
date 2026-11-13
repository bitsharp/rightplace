import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, fonts, glow, heights, radius, spacing } from '@/theme/tokens';

type Props = {
  name: string;
  // Only the friends map passes one (how many of my friends go): never a turnout number.
  caption?: string;
  onPress: () => void;
};

// A point someone declared that is not (yet) a hot spot: cyan, a rounded tag with the name, never a circle,
// and never any number (below k = 3 even "pochi" would be a statistic). "Stasera" layer, principle 11.
export function SpotMarker({ name, caption, onPress }: Props) {
  const { t } = useTranslation('map');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('spot.a11y', { name })}
      onPress={onPress}
      style={styles.hit}
    >
      <View testID="spot-marker" style={[styles.tag, glow, styles.look]}>
        <View style={styles.row}>
          <Text variant="label10" color="maybe" style={styles.label}>
            {t('spot.label')}
          </Text>
          {caption ? (
            <Text variant="label10" style={styles.caption}>
              {caption}
            </Text>
          ) : null}
        </View>
        <Text variant="body12" numberOfLines={1} style={styles.name}>
          {name}
        </Text>
      </View>
    </Pressable>
  );
}

const MAX_NAME_WIDTH = 120;

const styles = StyleSheet.create({
  hit: { minHeight: heights.minTapTarget, alignItems: 'center', justifyContent: 'center' },
  tag: {
    maxWidth: MAX_NAME_WIDTH + spacing.lg,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.segmented,
    borderWidth: 1.5,
    borderStyle: 'solid',
    gap: 1,
  },
  look: { borderColor: colors.maybe, backgroundColor: colors.maybeFill, shadowColor: colors.maybe },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  label: { fontFamily: fonts.monoBold, textTransform: 'uppercase' },
  caption: { fontFamily: fonts.monoBold, color: colors.text },
  name: { color: colors.text, maxWidth: MAX_NAME_WIDTH },
});
