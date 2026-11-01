import { Image } from 'expo-image';
import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { photoScenes } from '@/theme/tokens';

type Props = {
  height: number;
  uri?: string;
  scene?: number;
  accessibilityLabel?: string;
};

export function PhotoFrame({ height, uri, scene = 0, accessibilityLabel }: Props) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        accessible
        accessibilityLabel={accessibilityLabel}
        contentFit="cover"
        style={{ height, width: '100%' }}
      />
    );
  }
  return <ScenePlaceholder height={height} scene={scene} />;
}

// Gradient stand-in while a photo loads or is missing (the mock-up "FOTO DI ESEMPIO" scenes).
function ScenePlaceholder({ height, scene }: { height: number; scene: number }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const look = photoScenes[Math.abs(scene) % photoScenes.length] ?? photoScenes[0];
  const [first, second, last] = look.stops;
  return (
    <View
      testID="photo-placeholder"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ height }}
    >
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <LinearGradient id={`b${id}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={look.from} />
            <Stop offset="1" stopColor={last} />
          </LinearGradient>
          <RadialGradient id={`f${id}`} cx="25%" cy="30%" r="45%">
            <Stop offset="0" stopColor={first} stopOpacity={0.8} />
            <Stop offset="1" stopColor={first} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`s${id}`} cx="78%" cy="25%" r="40%">
            <Stop offset="0" stopColor={second} stopOpacity={0.7} />
            <Stop offset="1" stopColor={second} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100" height="100" fill={`url(#b${id})`} />
        <Rect width="100" height="100" fill={`url(#f${id})`} />
        <Rect width="100" height="100" fill={`url(#s${id})`} />
      </Svg>
    </View>
  );
}
