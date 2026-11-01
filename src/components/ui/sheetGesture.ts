type Drag = { dy: number; vy: number; height: number };

const MAX_DISTANCE = 120;
const FLICK_VELOCITY = 1;

export function shouldDismissSheet({ dy, vy, height }: Drag): boolean {
  if (dy <= 0) return false;
  return dy > Math.min(MAX_DISTANCE, height / 4) || vy > FLICK_VELOCITY;
}
