import { Pressable, StyleSheet, View } from 'react-native';

import { selectionFeedback } from '@/lib/haptics';
import { colors, heights, radius } from '@/theme/tokens';

import { Text } from './Text';

export type SegmentTone = 'going' | 'maybe' | 'neutral';

export type SegmentOption<T extends string> = {
  value: T;
  label: string;
  tone?: SegmentTone;
};

type Props<T extends string> = {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
};

// "Chi ci va" in Locale.dc.html: each option keeps its own active colour (violet / cyan / white).
const ACTIVE_BACKGROUND: Record<SegmentTone, string> = {
  going: colors.going,
  maybe: colors.maybe,
  neutral: colors.text,
};

const HIT_SLOP = { top: 4, bottom: 4 };

export function SegmentedControl<T extends string>({ options, value, onChange }: Props<T>) {
  const select = (next: T) => {
    if (next === value) return;
    selectionFeedback();
    onChange(next);
  };

  return (
    <View style={styles.track}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
            hitSlop={HIT_SLOP}
            onPress={() => select(option.value)}
            style={[
              styles.segment,
              active && { backgroundColor: ACTIVE_BACKGROUND[option.tone ?? 'going'] },
            ]}
          >
            <Text
              variant={active ? 'body13Medium' : 'body13'}
              color={active ? 'onAccent' : 'textSecondary'}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: radius.segmented,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  segment: {
    flex: 1,
    height: heights.segmented,
    borderRadius: radius.segmentedInner,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
