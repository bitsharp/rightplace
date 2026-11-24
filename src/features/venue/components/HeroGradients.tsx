import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { Glow } from '@/components/ui/Glow';
import { colors } from '@/theme/tokens';

type Stops = readonly { offset: number; color: string; opacity: number }[];

function Vertical({ stops, testID }: { stops: Stops; testID: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <View testID={testID} pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            {stops.map((stop) => (
              <Stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

const FADE: Stops = [
  { offset: 0.45, color: colors.background, opacity: 0 },
  { offset: 1, color: colors.background, opacity: 1 },
];

// Bottom of the photo melts into the page background.
export function HeroFade() {
  return <Vertical testID="venue-hero-fade" stops={FADE} />;
}

const VIOLET: Stops = [
  { offset: 0, color: colors.primary, opacity: 0.5 },
  { offset: 0.7, color: colors.primary, opacity: 0.12 },
  { offset: 1, color: colors.background, opacity: 1 },
];

// No photo: a violet gradient with a halo, so the page keeps its weight.
export function HeroBackdrop() {
  return (
    <>
      <Vertical testID="venue-hero-backdrop" stops={VIOLET} />
      <View pointerEvents="none" style={styles.halo}>
        <Glow testID="venue-hero-glow" radius={120} style={styles.glow} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  halo: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'relative' },
});
