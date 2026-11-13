import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

import type { PressPoint } from '../domain/longPress';
import type { PressRing } from '../useSpotLongPress';

const RING_SIZE = 88;
const MIN_FILL = 10;

type Props = {
  ring: PressRing | null;
  // Where the map starts on the page: the touch comes in page coordinates, the ring is drawn inside the map.
  offset: PressPoint;
};

// Visible progress of the 3 s press: a cyan ring around the finger and a disc that fills it. Decorative only.
export function SpotPressRing({ ring, offset }: Props) {
  if (ring === null) return null;
  const fill = MIN_FILL + (RING_SIZE - MIN_FILL - 2 * RING_BORDER) * ring.progress;
  return (
    <View
      testID="spot-press-ring"
      pointerEvents="none"
      style={[
        styles.ring,
        { left: ring.x - offset.x - RING_SIZE / 2, top: ring.y - offset.y - RING_SIZE / 2 },
      ]}
    >
      <View testID="spot-press-fill" style={[styles.fill, { width: fill, height: fill }]} />
    </View>
  );
}

const RING_BORDER = 3;

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: RING_BORDER,
    borderColor: colors.maybe,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: { borderRadius: RING_SIZE, backgroundColor: colors.maybeFill },
});
