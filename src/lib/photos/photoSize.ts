export const MAX_PHOTO_SIDE = 1280;

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
