import {
  useCallback,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type RefObject,
} from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import type MapView from 'react-native-maps';

import type { LatLng } from '@/features/profile/domain/coarsen';

import type { PressPoint } from '../domain/longPress';
import { useSpotLongPress } from '../useSpotLongPress';

import { SpotPressRing } from './SpotPressRing';

type Props = {
  mapRef: RefObject<MapView | null>;
  // The geographic point under the finger, after a full long press.
  onPick: (point: LatLng) => void;
  children: ReactNode;
};

const ORIGIN: PressPoint = { x: 0, y: 0 };

// Listens to the touches that reach the map container without taking them: pan and pinch stay with the map.
// Touches come in page coordinates; the map wants coordinates inside itself, so the container's page origin is
// measured when a finger lands.
export function SpotPressSurface({ mapRef, onPick, children }: Props) {
  const surface = useRef<ComponentRef<typeof View>>(null);
  const origin = useRef<PressPoint>(ORIGIN);
  const [offset, setOffset] = useState<PressPoint>(ORIGIN);

  const resolve = useCallback(
    async (page: PressPoint) => {
      const local = { x: page.x - origin.current.x, y: page.y - origin.current.y };
      const coordinate = await mapRef.current?.coordinateForPoint(local);
      if (coordinate) onPick({ lat: coordinate.latitude, lng: coordinate.longitude });
    },
    [mapRef, onPick],
  );
  const { handlers, ring } = useSpotLongPress(resolve);

  const onTouchStart = (event: GestureResponderEvent) => {
    surface.current?.measure((_x, _y, _width, _height, pageX, pageY) => {
      origin.current = { x: pageX, y: pageY };
      setOffset(origin.current);
    });
    handlers.onTouchStart(event);
  };

  return (
    <View
      ref={surface}
      testID="map-press-surface"
      style={styles.surface}
      {...handlers}
      onTouchStart={onTouchStart}
    >
      {children}
      <SpotPressRing ring={ring} offset={offset} />
    </View>
  );
}

const styles = StyleSheet.create({ surface: { ...StyleSheet.absoluteFill } });
