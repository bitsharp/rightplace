import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { colors } from '@/theme/tokens';

const BOX = 88;
const RING = 56;
const PULSE_MS = 700;
const MAX_SCALE = BOX / RING;

function PulsingRing() {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: PULSE_MS, easing: Easing.out(Easing.quad) }),
      -1,
    );
    return () => cancelAnimation(progress);
  }, [progress]);
  const pulse = useAnimatedStyle(() => ({
    opacity: 1 - progress.value * 0.7,
    transform: [{ scale: 1 + progress.value * (MAX_SCALE - 1) }],
  }));
  return <Animated.View style={[styles.ring, pulse]} />;
}

// The primary-violet ring drawn around a venue the user just picked from "I più animati". Decorative: the
// venue itself is announced by its own marker. Reduce motion: a still ring.
export function HighlightRing({ animated }: { animated: boolean }) {
  return (
    <View
      testID="highlight-ring"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.box}
    >
      {animated ? <PulsingRing /> : <View testID="highlight-ring-static" style={styles.ring} />}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: BOX, height: BOX, alignItems: 'center', justifyContent: 'center' },
  ring: {
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 3,
    borderColor: colors.primary,
    backgroundColor: colors.goingSoft,
  },
});
