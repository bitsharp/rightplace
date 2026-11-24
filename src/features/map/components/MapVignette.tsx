import { Platform, StyleSheet, View } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme/tokens';

// Veil over the map of the 24/11 mock-up: a faint violet glow at the centre, edges fading to black.
// Purely decorative and drawn with SVG (no native dependency): it never takes touches, so pan, pinch and the
// 3 s long press for spots reach the map untouched. Apple Maps cannot be styled, so on iOS a light violet tint
// brings it closer to the Android style.
const IOS_TINT_OPACITY = 0.07;

export function MapVignette() {
  return (
    <View
      testID="map-vignette"
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.veil}
    >
      <Svg width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <RadialGradient id="map-vignette-center" cx="50%" cy="50%" r="55%">
            <Stop offset={0} stopColor={colors.primary} stopOpacity={0.18} />
            <Stop offset={1} stopColor={colors.primary} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id="map-vignette-edges" cx="50%" cy="50%" r="71%">
            <Stop offset={0.55} stopColor={colors.background} stopOpacity={0} />
            <Stop offset={1} stopColor={colors.background} stopOpacity={0.85} />
          </RadialGradient>
        </Defs>
        {Platform.OS === 'ios' ? (
          <Rect
            testID="map-vignette-tint"
            width="100%"
            height="100%"
            fill={colors.primary}
            fillOpacity={IOS_TINT_OPACITY}
          />
        ) : null}
        <Rect width="100%" height="100%" fill="url(#map-vignette-center)" />
        <Rect width="100%" height="100%" fill="url(#map-vignette-edges)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ veil: { ...StyleSheet.absoluteFill } });
