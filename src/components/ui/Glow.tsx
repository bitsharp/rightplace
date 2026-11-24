import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { colors } from '@/theme/tokens';

type Props = {
  // Any hex from the theme tokens; defaults to the primary violet.
  color?: string;
  // Radius in points: the view is 2 × radius wide and tall.
  radius?: number;
  style?: ViewStyle;
  testID?: string;
};

export function glowStops(color: string) {
  return [
    { offset: 0, color, opacity: 0.9 },
    { offset: 0.45, color, opacity: 0.35 },
    { offset: 1, color, opacity: 0 },
  ] as const;
}

// Radial halo drawn with SVG (no native gradient/blur dependency). Purely decorative: it never takes touches.
export function Glow({ color = colors.primary, radius = 60, style, testID }: Props) {
  const size = radius * 2;
  const gradientId = `glow-${color.replace('#', '')}`;
  return (
    <View
      testID={testID}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[styles.glow, { width: size, height: size }, style]}
    >
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            {glowStops(color).map((stop) => (
              <Stop
                key={stop.offset}
                offset={stop.offset}
                stopColor={stop.color}
                stopOpacity={stop.opacity}
              />
            ))}
          </RadialGradient>
        </Defs>
        <Rect width={size} height={size} fill={`url(#${gradientId})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ glow: { position: 'absolute' } });
