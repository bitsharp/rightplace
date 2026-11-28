import { Circle, G, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

import { Glint, INK_PROPS, Shade, type SceneProps } from './shared';

const SHELF_TONES = [colors.primary, colors.secondary, colors.warm, colors.warmDeep] as const;

function Bottle({ x, base, h, tone }: { x: number; base: number; h: number; tone: string }) {
  return (
    <G>
      <Rect x={x} y={base - h * 0.65} width={8} height={h * 0.65} rx={2} fill={tone} />
      <Rect x={x + 2.5} y={base - h} width={3} height={h * 0.4} fill={tone} />
      <Glint x={x + 1.5} y={base - h * 0.6} h={h * 0.35} />
    </G>
  );
}

function Shelf({ y, xs }: { y: number; xs: readonly number[] }) {
  return (
    <G>
      {xs.map((x, i) => (
        <Bottle key={x} x={x} base={y} h={16 + ((i * 5) % 8)} tone={SHELF_TONES[i % 4]!} />
      ))}
      <Rect x={10} y={y} width={180} height={4} fill={colors.warmDeep} />
    </G>
  );
}

function Lamp({ x }: { x: number }) {
  return (
    <G>
      <Circle cx={x} cy={30} r={15} fill={colors.warm} opacity={0.25} stroke="none" />
      <Path d={`M${x} 0V13`} />
      <Path d={`M${x - 13} 28L${x - 5} 13h10l8 15z`} fill={colors.warm} />
      <Circle cx={x} cy={29} r={3} fill={colors.text} />
    </G>
  );
}

// A cocktail glass in neon, on a framed sign.
function NeonSign() {
  return (
    <G>
      <Rect x={84} y={34} width={32} height={42} rx={8} fill={colors.background} />
      <G stroke={colors.secondary} strokeWidth={2.5}>
        <Path d="M92 44h16l-8 12zM100 56v10M94 66h12" fill="none" />
      </G>
      <Circle cx={100} cy={50} r={13} fill={colors.secondary} opacity={0.15} stroke="none" />
    </G>
  );
}

function Stool({ x }: { x: number }) {
  return (
    <G>
      <Rect x={x - 2} y={130} width={4} height={14} fill={colors.border} />
      <Path d={`M${x - 11} 147h22`} />
      <Path d={`M${x - 14} 126a14 4 0 0 1 28 0a14 4 0 0 1-28 0z`} fill={colors.primary} />
    </G>
  );
}

// Behind a bar: bottle shelves, pendant lamps and a neon sign; the counter and its stools in front.
export function BarScene({ halftone }: SceneProps) {
  return (
    <G testID="cover-scene-bar">
      <G testID="cover-outlines" {...INK_PROPS}>
        <Rect x={0} y={0} width={200} height={100} fill={colors.surface} stroke="none" />
        <Shade id={halftone} x={0} y={70} width={200} height={30} opacity={0.5} />
        <Shelf y={54} xs={[16, 30, 44, 58, 130, 144, 158, 172]} />
        <Shelf y={80} xs={[16, 30, 44, 58, 130, 144, 158, 172]} />
        <NeonSign />
        <Lamp x={36} />
        <Lamp x={100} />
        <Lamp x={164} />
        <Rect x={0} y={98} width={200} height={9} fill={colors.warmDeep} />
        <Rect x={0} y={107} width={200} height={43} fill={colors.border} />
        <Path d="M40 107v43M80 107v43M120 107v43M160 107v43" />
        <Shade id={halftone} x={0} y={128} width={200} height={22} />
        <Path d="M58 98l-7-14h14zM60 98v0" fill={colors.secondary} />
        <Path d="M140 98v-12h10v12z" fill={colors.goingSoft} />
        <Stool x={30} />
        <Stool x={100} />
        <Stool x={170} />
      </G>
    </G>
  );
}
