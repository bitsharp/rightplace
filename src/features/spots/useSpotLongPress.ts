import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GestureResponderEvent } from 'react-native';

import { confirmFeedback } from '@/lib/haptics';

import {
  endPress,
  movePress,
  pressProgress,
  startPress,
  tickPress,
  type PressPoint,
  type PressState,
} from './domain/longPress';

const TICK_MS = 50;
const IDLE: PressState = { kind: 'idle' };

export type PressRing = { x: number; y: number; progress: number };

type Touch = { point: PressPoint; touches: number };

const readTouch = (event: GestureResponderEvent): Touch => ({
  point: { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY },
  touches: event.nativeEvent.touches.length,
});

// Wires the pure press state machine to raw touch events (they bubble from the native map, so pan and pinch keep
// working untouched). `onFire` gets the page position of the finger when it is lifted after the full 3 s.
export function useSpotLongPress(onFire: (point: PressPoint) => void) {
  const [state, setState] = useState<PressState>(IDLE);
  const current = useRef<PressState>(IDLE);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timer.current !== null) clearInterval(timer.current);
    timer.current = null;
  }, []);
  const commit = useCallback(
    (next: PressState) => {
      const justFired = next.kind === 'fired' && current.current.kind !== 'fired';
      current.current = next;
      setState(next);
      if (next.kind !== 'pressing') stopTimer();
      if (justFired) confirmFeedback();
    },
    [stopTimer],
  );
  useEffect(() => stopTimer, [stopTimer]);

  const handlers = useMemo(
    () => ({
      onTouchStart: (event: GestureResponderEvent) => {
        const { point, touches } = readTouch(event);
        stopTimer();
        commit(startPress(current.current, point, Date.now(), touches));
        if (current.current.kind === 'pressing') {
          timer.current = setInterval(
            () => commit(tickPress(current.current, Date.now())),
            TICK_MS,
          );
        }
      },
      onTouchMove: (event: GestureResponderEvent) => {
        const { point, touches } = readTouch(event);
        commit(movePress(current.current, point, touches));
      },
      onTouchEnd: () => {
        const { state: next, picked } = endPress(current.current);
        commit(next);
        if (picked) onFire(picked);
      },
      onTouchCancel: () => commit(IDLE),
    }),
    [commit, onFire, stopTimer],
  );

  const ring: PressRing | null =
    state.kind === 'pressing' || state.kind === 'fired'
      ? {
          ...(state.kind === 'fired' ? state.origin : state.origin),
          progress: pressProgress(state),
        }
      : null;
  return { handlers, ring };
}
