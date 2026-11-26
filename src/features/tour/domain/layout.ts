export type Rect = { x: number; y: number; width: number; height: number };
export type Size = { width: number; height: number };

export type BubblePlacement = {
  placement: 'above' | 'below';
  // below: distance from the top of the screen; above: distance from the bottom of the screen
  offset: number;
  left: number;
  width: number;
  // x of the arrow inside the bubble
  arrowX: number;
};

const BUBBLE_MARGIN = 16;
const BUBBLE_GAP = 10;
const ARROW_INSET = 24;
// Room the bubble needs (text + button): decides above/below before it is measured.
const BUBBLE_ROOM = 150;

// The area that stays bright: the anchor with some air around it, never outside the screen.
export function spotlightRect(anchor: Rect, container: Size, padding: number): Rect {
  const x = Math.max(0, anchor.x - padding);
  const y = Math.max(0, anchor.y - padding);
  const right = Math.min(container.width, anchor.x + anchor.width + padding);
  const bottom = Math.min(container.height, anchor.y + anchor.height + padding);
  return { x, y, width: right - x, height: bottom - y };
}

export function placeBubble(hole: Rect, container: Size): BubblePlacement {
  const width = container.width - BUBBLE_MARGIN * 2;
  const holeBottom = hole.y + hole.height;
  const fitsBelow = holeBottom + BUBBLE_GAP + BUBBLE_ROOM <= container.height;
  const center = hole.x + hole.width / 2 - BUBBLE_MARGIN;
  const arrowX = Math.min(Math.max(center, ARROW_INSET), width - ARROW_INSET);
  const base = { left: BUBBLE_MARGIN, width, arrowX };
  if (fitsBelow) return { ...base, placement: 'below', offset: holeBottom + BUBBLE_GAP };
  return { ...base, placement: 'above', offset: container.height - hole.y + BUBBLE_GAP };
}

// SVG path with two sub-paths (screen, rounded hole) to fill with the even-odd rule: the hole stays clear.
export function holePath(container: Size, hole: Rect, radius: number): string {
  const r = Math.min(radius, hole.width / 2, hole.height / 2);
  const { x, y, width, height } = hole;
  const screen = `M0 0H${container.width}V${container.height}H0Z`;
  const rounded =
    `M${x + r} ${y}H${x + width - r}A${r} ${r} 0 0 1 ${x + width} ${y + r}` +
    `V${y + height - r}A${r} ${r} 0 0 1 ${x + width - r} ${y + height}` +
    `H${x + r}A${r} ${r} 0 0 1 ${x} ${y + height - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`;
  return `${screen}${rounded}`;
}
