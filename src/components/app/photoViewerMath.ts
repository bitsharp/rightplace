// Pure zoom / pan / paging rules of the full-screen photo viewer. Every function is a worklet: the gestures
// run them on the UI thread (in Jest they are plain functions).
export type Point = { x: number; y: number };
export type Size = { width: number; height: number };

export const MIN_SCALE = 1;
export const MAX_SCALE = 4;
export const DOUBLE_TAP_SCALE = 2;
// Below this a photo counts as "not zoomed": paging and swipe-down-to-close stay available.
const ZOOMED_TOLERANCE = 0.01;
const DISMISS_DISTANCE = 140;
// px/s (react-native-gesture-handler)
const DISMISS_VELOCITY = 1000;

export function clampScale(scale: number): number {
  'worklet';
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

export function isZoomed(scale: number): boolean {
  'worklet';
  return scale > MIN_SCALE + ZOOMED_TOLERANCE;
}

// The photo is drawn at the size of the viewport: zoomed by `scale` it overflows by half the extra size per side.
export function maxTranslation(size: Size, scale: number): Point {
  'worklet';
  return {
    x: (size.width * (scale - 1)) / 2,
    y: (size.height * (scale - 1)) / 2,
  };
}

function clampAxis(value: number, limit: number): number {
  'worklet';
  // + 0 turns -0 into 0
  return Math.min(limit, Math.max(-limit, value)) + 0;
}

export function clampTranslation(translation: Point, size: Size, scale: number): Point {
  'worklet';
  const limit = maxTranslation(size, scale);
  return { x: clampAxis(translation.x, limit.x), y: clampAxis(translation.y, limit.y) };
}

// Zoom keeping the content under `focal` (relative to the viewport centre) under the finger.
export function scaleAround(
  translation: Point,
  scale: number,
  nextScale: number,
  focal: Point,
  size: Size,
): Point {
  'worklet';
  const ratio = nextScale / scale;
  const moved = {
    x: focal.x - ratio * (focal.x - translation.x),
    y: focal.y - ratio * (focal.y - translation.y),
  };
  return clampTranslation(moved, size, nextScale);
}

export function doubleTapTarget(scale: number): number {
  'worklet';
  return isZoomed(scale) ? MIN_SCALE : DOUBLE_TAP_SCALE;
}

type Drag = { translationY: number; velocityY: number; height: number };

export function shouldDismissViewer({ translationY, velocityY, height }: Drag): boolean {
  'worklet';
  return (
    Math.abs(translationY) > Math.min(DISMISS_DISTANCE, height / 5) ||
    Math.abs(velocityY) > DISMISS_VELOCITY
  );
}

export function pageIndexFromOffset(offsetX: number, pageWidth: number, count: number): number {
  'worklet';
  if (pageWidth <= 0 || count <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.round(offsetX / pageWidth)));
}
