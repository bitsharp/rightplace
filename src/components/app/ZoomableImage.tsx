import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';

import type { Size } from './photoViewerMath';
import { ScenePlaceholder } from './PhotoFrame';
import { useZoomGestures } from './useZoomGestures';

type Props = {
  size: Size;
  uri?: string;
  // Signed URLs change on every request and photos are ephemeral (principle 5): memory cache only, under a stable key.
  cacheKey?: string;
  scene?: number;
  label: string;
  onZoomChange: (zoomed: boolean) => void;
  onDismiss: () => void;
};

// One photo of the viewer: contained in the screen, zoomable and draggable.
export function ZoomableImage({
  size,
  uri,
  cacheKey,
  scene = 0,
  label,
  onZoomChange,
  onDismiss,
}: Props) {
  const { gesture, style } = useZoomGestures({ size, onZoomChange, onDismiss });
  const [loaded, setLoaded] = useState(false);
  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        testID="zoomable-image"
        style={[{ width: size.width, height: size.height }, style]}
      >
        {loaded ? null : <ScenePlaceholder height={size.height} scene={scene} />}
        {uri ? (
          <Image
            source={cacheKey ? { uri, cacheKey } : { uri }}
            cachePolicy={cacheKey ? 'memory' : undefined}
            contentFit="contain"
            accessible
            accessibilityLabel={label}
            onLoad={() => setLoaded(true)}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}
