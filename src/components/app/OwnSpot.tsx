import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/Text';
import type { Intent } from '@/features/nights/domain/band';
import { colors, fonts, glow, heights, radius, spacing } from '@/theme/tokens';

type Props = { venueName: string; intent: Intent; onPress: () => void };

const LOOK: Record<Intent, { borderColor: string; backgroundColor: string }> = {
  going: { borderColor: colors.going, backgroundColor: colors.goingFill },
  maybe: { borderColor: colors.maybe, backgroundColor: colors.maybeFill },
};

// "My night" label on the venue I declared: shown to me whatever the turnout (it is my own data).
export function OwnSpot({ venueName, intent, onPress }: Props) {
  const { t } = useTranslation('map');
  const label = t(`own.${intent}`);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('own.a11y', { venue: venueName, intent: label })}
      onPress={onPress}
      style={[styles.chip, glow, LOOK[intent]]}
    >
      <Text variant="label12" style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: heights.minTapTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    borderWidth: 2,
  },
  label: { fontFamily: fonts.monoBold, color: colors.text, textTransform: 'uppercase' },
});
