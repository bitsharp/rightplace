// Product decision (prompt 20): 3 s, with a visible ring. If testers find it too long, change this constant only.
export const SPOT_LONG_PRESS_MS = 3000;
// Beyond this the finger is panning the map, not pressing a spot.
export const LONG_PRESS_MOVE_TOLERANCE_PX = 12;

export type PressPoint = { x: number; y: number };

export type PressState =
  | { kind: 'idle' }
  | { kind: 'pressing'; origin: PressPoint; startedAt: number; progress: number }
  | { kind: 'fired'; origin: PressPoint }
  | { kind: 'cancelled' };

const CANCELLED: PressState = { kind: 'cancelled' };
const IDLE: PressState = { kind: 'idle' };

export function startPress(
  _state: PressState,
  point: PressPoint,
  now: number,
  touches: number,
): PressState {
  if (touches !== 1) return CANCELLED;
  return { kind: 'pressing', origin: point, startedAt: now, progress: 0 };
}

const distance = (a: PressPoint, b: PressPoint) => Math.hypot(a.x - b.x, a.y - b.y);

// A second finger (pinch) always cancels; a long move cancels only while the ring is still filling.
export function movePress(state: PressState, point: PressPoint, touches: number): PressState {
  if (state.kind === 'idle' || state.kind === 'cancelled') return state;
  if (touches !== 1) return CANCELLED;
  if (state.kind === 'pressing' && distance(state.origin, point) > LONG_PRESS_MOVE_TOLERANCE_PX) {
    return CANCELLED;
  }
  return state;
}

export function tickPress(state: PressState, now: number): PressState {
  if (state.kind !== 'pressing') return state;
  const elapsed = now - state.startedAt;
  if (elapsed >= SPOT_LONG_PRESS_MS) return { kind: 'fired', origin: state.origin };
  return { ...state, progress: elapsed / SPOT_LONG_PRESS_MS };
}

// The sheet opens when the finger is lifted after the ring completed, never while the map is being touched.
export function endPress(state: PressState): { state: PressState; picked: PressPoint | null } {
  return { state: IDLE, picked: state.kind === 'fired' ? state.origin : null };
}

export function pressProgress(state: PressState): number {
  if (state.kind === 'fired') return 1;
  return state.kind === 'pressing' ? state.progress : 0;
}
