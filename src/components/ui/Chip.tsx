import { Pressable, StyleSheet } from 'react-native';

import { colors, heights, radius, spacing } from '@/theme/tokens';

import { Text } from './Text';

type Tone = 'going' | 'maybe';

type Props = {
  label: string;
  selected: boolean;
  onPress: () => void;
  tone?: Tone;
  // For short visible labels (a single letter) that need a spoken name
  accessibilityLabel?: string;
};

const SELECTED = {
  going: { borderColor: colors.going, backgroundColor: colors.goingTint },
  maybe: { borderColor: colors.maybe, backgroundColor: colors.maybeTint },
} as const;

// 36 pt tall like the mock-up; hitSlop brings the touch area to 44.
const HIT_SLOP = { top: 4, bottom: 4 };

export function Chip({ label, selected, onPress, tone = 'going', accessibilityLabel }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected }}
      hitSlop={HIT_SLOP}
      onPress={onPress}
      style={[styles.chip, selected ? SELECTED[tone] : styles.idle]}
    >
      <Text variant={selected ? 'body13Medium' : 'body13'}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: heights.chip,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    justifyContent: 'center',
  },
  idle: { borderColor: colors.border, backgroundColor: colors.surface },
});
