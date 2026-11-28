import { Circle, Pattern, Rect, type RectProps } from 'react-native-svg';

import { colors } from '@/theme/tokens';

export type SceneProps = { halftone: string };

// Thick black ink: every shape inside a scene's outline group inherits it; `stroke="none"` opts out.
export const INK_PROPS = {
  stroke: colors.ink,
  strokeWidth: 2.5,
  strokeLinejoin: 'round',
  strokeLinecap: 'round',
} as const;

// The comic halftone: a regular grid of ink dots, painted over the flat shadows.
export function HalftonePattern({ id }: { id: string }) {
  return (
    <Pattern id={id} width={4} height={4} patternUnits="userSpaceOnUse">
      <Circle testID="cover-halftone" cx={2} cy={2} r={1} fill={colors.ink} />
    </Pattern>
  );
}

// A flat shadow: a rectangle filled with the halftone, without outline.
export function Shade({ id, ...rect }: RectProps & { id: string }) {
  return <Rect testID="cover-shade" {...rect} fill={`url(#${id})`} stroke="none" />;
}

// A tiny glossy highlight, for bottles, glasses, lamps.
export function Glint({ x, y, h }: { x: number; y: number; h: number }) {
  return <Rect x={x} y={y} width={1.6} height={h} rx={0.8} fill={colors.text} stroke="none" />;
}
