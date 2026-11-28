import { Circle, G, Path, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

import { INK_PROPS, Shade, type SceneProps } from './shared';

const WINDOWS = [
  [16, 66],
  [28, 78],
  [54, 56],
  [66, 70],
  [92, 74],
  [130, 64],
  [142, 80],
  [170, 82],
] as const;

function Skyline() {
  return (
    <G>
      <Rect x={6} y={58} width={34} height={44} fill={colors.surface} />
      <Rect x={44} y={42} width={32} height={60} fill={colors.surface} />
      <Rect x={80} y={66} width={26} height={36} fill={colors.surface} />
      <Rect x={110} y={52} width={34} height={50} fill={colors.surface} />
      <Rect x={148} y={72} width={44} height={30} fill={colors.surface} />
      {WINDOWS.map(([x, y]) => (
        <Rect
          key={`${x}-${y}`}
          x={x}
          y={y}
          width={6}
          height={8}
          fill={colors.warm}
          strokeWidth={1.5}
        />
      ))}
    </G>
  );
}

function StringLights() {
  return (
    <G>
      <Path d="M0 8Q50 30 100 12T200 10" fill="none" />
      {[22, 50, 78, 106, 134, 162, 188].map((x, i) => (
        <Circle key={x} cx={x} cy={18 + (i % 2) * 6} r={3.5} fill={colors.warm} strokeWidth={1.5} />
      ))}
    </G>
  );
}

function Sofa() {
  return (
    <G>
      <Rect x={10} y={106} width={64} height={18} rx={5} fill={colors.primary} />
      <Rect x={6} y={116} width={14} height={20} rx={5} fill={colors.primary} />
      <Rect x={64} y={116} width={14} height={20} rx={5} fill={colors.primary} />
      <Rect x={18} y={118} width={50} height={14} rx={4} fill={colors.goingBorder} />
      <Path d="M14 136v6M70 136v6" />
    </G>
  );
}

function Plant() {
  return (
    <G>
      <Path d="M150 148l4-18h22l4 18z" fill={colors.warmDeep} />
      <Path d="M165 130C150 118 148 106 156 98c8 6 11 16 9 32z" fill={colors.secondary} />
      <Path d="M165 130C178 116 186 108 180 96c-9 5-16 16-15 34z" fill={colors.secondary} />
      <Path d="M165 130C165 112 168 100 166 90c-6 10-6 24-1 40z" fill={colors.maybeBorder} />
    </G>
  );
}

// A terrace at night: a moon over the skyline, string lights, a railing, a sofa and a plant.
export function RooftopScene({ halftone }: SceneProps) {
  return (
    <G testID="cover-scene-rooftop">
      <G testID="cover-outlines" {...INK_PROPS}>
        <Circle cx={150} cy={32} r={17} fill={colors.warm} />
        <Shade id={halftone} x={140} y={28} width={30} height={22} />
        <Skyline />
        <Rect x={0} y={96} width={200} height={54} fill={colors.border} />
        <Path d="M0 114h200M0 132h200" strokeWidth={1.5} />
        <Shade id={halftone} x={0} y={96} width={200} height={10} />
        <Path d="M0 96h200" strokeWidth={3} />
        <Path d="M12 96v-14M36 96v-14M60 96v-14M84 96v-14M108 96v-14M132 96v-14M156 96v-14M180 96v-14M0 84h200" />
        <StringLights />
        <Sofa />
        <Plant />
      </G>
    </G>
  );
}
