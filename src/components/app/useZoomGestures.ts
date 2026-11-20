import { useCallback, useState } from 'react';
import {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
  useTapGesture,
} from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

import {
  clampScale,
  clampTranslation,
  doubleTapTarget,
  isZoomed,
  scaleAround,
  shouldDismissViewer,
  type Size,
} from './photoViewerMath';

type Options = {
  size: Size;
  onZoomChange: (zoomed: boolean) => void;
  onDismiss: () => void;
};

type Zoom = {
  size: Size;
  scale: SharedValue<number>;
  x: SharedValue<number>;
  y: SharedValue<number>;
};

const ZOOM_MS = 200;
// A vertical drag claims the touch only when it is clearly vertical: horizontal moves go to the pager.
const VERTICAL_ACTIVATION = [-12, 12] as [number, number];

// Tells React (paging on/off, which pan is enabled) when the photo crosses the 1× line.
function useZoomedState(scale: SharedValue<number>, onZoomChange: (zoomed: boolean) => void) {
  const [zoomed, setZoomed] = useState(false);
  // Compared with what was last reported, not with the previous frame: no change is ever missed.
  const reported = useSharedValue(false);
  const report = useCallback(
    (next: boolean) => {
      setZoomed(next);
      onZoomChange(next);
    },
    [onZoomChange],
  );
  useAnimatedReaction(
    () => isZoomed(scale.get()),
    (now) => {
      if (now === reported.get()) return;
      reported.set(now);
      scheduleOnRN(report, now);
    },
  );
  return zoomed;
}

function usePinch({ size, scale, x, y }: Zoom) {
  return usePinchGesture({
    testID: 'viewer-pinch',
    onUpdate: (event) => {
      'worklet';
      const next = clampScale(scale.get() * event.scaleChange);
      const focal = { x: event.focalX - size.width / 2, y: event.focalY - size.height / 2 };
      const moved = scaleAround({ x: x.get(), y: y.get() }, scale.get(), next, focal, size);
      scale.set(next);
      x.set(moved.x);
      y.set(moved.y);
    },
  });
}

function usePanWhileZoomed({ size, scale, x, y }: Zoom, enabled: boolean) {
  return usePanGesture({
    testID: 'viewer-pan',
    enabled,
    onUpdate: (event) => {
      'worklet';
      const moved = clampTranslation(
        { x: x.get() + event.changeX, y: y.get() + event.changeY },
        size,
        scale.get(),
      );
      x.set(moved.x);
      y.set(moved.y);
    },
  });
}

function useSwipeToDismiss(
  height: number,
  dragY: SharedValue<number>,
  enabled: boolean,
  onDismiss: () => void,
) {
  return usePanGesture({
    testID: 'viewer-dismiss',
    enabled,
    activeOffsetY: VERTICAL_ACTIVATION,
    failOffsetX: VERTICAL_ACTIVATION,
    onUpdate: (event) => {
      'worklet';
      dragY.set(event.translationY);
    },
    onDeactivate: (event) => {
      'worklet';
      const { translationY, velocityY } = event;
      if (shouldDismissViewer({ translationY, velocityY, height })) scheduleOnRN(onDismiss);
      else dragY.set(withSpring(0));
    },
  });
}

function useDoubleTapZoom({ size, scale, x, y }: Zoom) {
  return useTapGesture({
    testID: 'viewer-double-tap',
    numberOfTaps: 2,
    onActivate: (event) => {
      'worklet';
      const next = doubleTapTarget(scale.get());
      const focal = { x: event.x - size.width / 2, y: event.y - size.height / 2 };
      const moved = scaleAround({ x: x.get(), y: y.get() }, scale.get(), next, focal, size);
      scale.set(withTiming(next, { duration: ZOOM_MS }));
      x.set(withTiming(moved.x, { duration: ZOOM_MS }));
      y.set(withTiming(moved.y, { duration: ZOOM_MS }));
    },
  });
}

// Pinch (1×–4×), double tap (2× / reset), pan while zoomed, swipe up/down to close while not zoomed.
// The maths lives in photoViewerMath; this only wires gestures to shared values.
export function useZoomGestures({ size, onZoomChange, onDismiss }: Options) {
  const scale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const dragY = useSharedValue(0);
  const zoom = { size, scale, x, y };
  const zoomed = useZoomedState(scale, onZoomChange);

  const gesture = useSimultaneousGestures(
    usePinch(zoom),
    usePanWhileZoomed(zoom, zoomed),
    useSwipeToDismiss(size.height, dragY, !zoomed, onDismiss),
    useDoubleTapZoom(zoom),
  );
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() },
      { translateY: y.get() + dragY.get() },
      { scale: scale.get() },
    ],
  }));
  return { gesture, style };
}
