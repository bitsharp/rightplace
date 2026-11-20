export const MAX_PHOTO_SIDE = 1280;
// A profile photo is shown at most ~120 px wide: 512 px keeps it sharp on 3x screens and the file tiny.
export const AVATAR_MAX_SIDE = 512;

export function resizeTarget(
  width: number,
  height: number,
  max: number = MAX_PHOTO_SIDE,
): { width: number; height: number } {
  const longSide = Math.max(width, height);
  if (longSide <= max) return { width, height };
  const scale = max / longSide;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}
