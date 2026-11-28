import { Circle, G, Path, Polygon, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

import { INK_PROPS, Shade, type SceneProps } from './shared';

function Lights() {
  return (
    <G>
      <Polygon
        points="30,14 44,14 84,104 40,104"
        fill={colors.secondary}
        opacity={0.25}
        stroke="none"
      />
      <Polygon
        points="156,14 170,14 160,104 116,104"
        fill={colors.primary}
        opacity={0.28}
        stroke="none"
      />
      <Rect x={0} y={4} width={200} height={10} fill={colors.border} />
      {[30, 70, 130, 170].map((x) => (
        <Rect key={x} x={x - 7} y={14} width={14} height={9} rx={2} fill={colors.warm} />
      ))}
    </G>
  );
}

function Amp({ x }: { x: number }) {
  return (
    <G>
      <Rect x={x} y={62} width={34} height={46} rx={3} fill={colors.surface} />
      <Circle cx={x + 17} cy={78} r={9} fill={colors.border} />
      <Circle cx={x + 17} cy={78} r={3} fill={colors.ink} />
      <Circle cx={x + 17} cy={97} r={5} fill={colors.border} />
    </G>
  );
}

function Drums() {
  return (
    <G>
      <Circle cx={100} cy={88} r={15} fill={colors.warmDeep} />
      <Circle cx={100} cy={88} r={5} fill={colors.warm} />
      <Circle cx={80} cy={74} r={8} fill={colors.warm} />
      <Circle cx={120} cy={74} r={8} fill={colors.warm} />
      <Path d="M62 62h14M126 58h14M69 62v36M133 58v40" />
    </G>
  );
}

// The singer at the microphone and a guitarist, both as black silhouettes against the lit stage.
function Band() {
  return (
    <G>
      <Circle cx={64} cy={56} r={8} fill={colors.ink} />
      <Path d="M52 108c0-22 4-34 12-34s12 12 12 34z" fill={colors.ink} />
      <Path d="M76 84l10-8M88 74v34" />
      <Circle cx={88} cy={72} r={3} fill={colors.text} />
      <Circle cx={142} cy={58} r={8} fill={colors.ink} />
      <Path d="M130 108c0-22 4-34 12-34s12 12 12 34z" fill={colors.ink} />
      <Path d="M126 96l30-18" strokeWidth={4} />
      <Path d="M122 98a7 7 0 1 1 10 6z" fill={colors.warm} />
    </G>
  );
}

// A stage seen from the audience: truss with spotlights, amplifiers, drums and the band.
export function LiveScene({ halftone }: SceneProps) {
  return (
    <G testID="cover-scene-live">
      <G testID="cover-outlines" {...INK_PROPS}>
        <Rect x={0} y={0} width={200} height={104} fill={colors.surface} stroke="none" />
        <Shade id={halftone} x={0} y={60} width={200} height={44} opacity={0.45} />
        <Lights />
        <Amp x={8} />
        <Amp x={158} />
        <Drums />
        <Band />
        <Path d="M0 104h200v46H0z" fill={colors.warmDeep} />
        <Path d="M0 104h200" strokeWidth={3} />
        <Path d="M100 104L40 150M100 104L160 150M100 104v46" strokeWidth={1.5} />
        <Shade id={halftone} x={0} y={126} width={200} height={24} />
      </G>
    </G>
  );
}
