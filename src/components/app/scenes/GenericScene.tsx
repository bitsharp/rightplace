import { Circle, G, Path, Polygon, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

import { INK_PROPS, Shade, type SceneProps } from './shared';

function Block({ side }: { side: 'left' | 'right' }) {
  const left = side === 'left';
  const face = left ? '0,18 76,46 76,112 0,128' : '200,18 124,46 124,112 200,128';
  const sign = left ? 'M12 54l38 13v14l-38-13z' : 'M188 54l-38 13v14l38-13z';
  return (
    <G>
      <Polygon points={face} fill={colors.surface} />
      <Path d={sign} fill={left ? colors.primary : colors.secondary} />
      {[0, 1].map((row) =>
        [0, 1].map((col) => {
          const x = left ? 12 + col * 26 : 138 + col * 26;
          return (
            <Rect
              key={`${row}${col}`}
              x={x}
              y={88 + row * 12}
              width={10}
              height={7}
              fill={colors.warm}
              strokeWidth={1.5}
            />
          );
        }),
      )}
    </G>
  );
}

function StreetLamp() {
  return (
    <G>
      <Circle cx={100} cy={36} r={18} fill={colors.warm} opacity={0.25} stroke="none" />
      <Path d="M100 112V40h-10" fill="none" />
      <Path d="M84 38h12l-2 7h-8z" fill={colors.warm} />
    </G>
  );
}

// A night street in perspective: two shopfronts with neon signs, a street lamp and the road.
export function GenericScene({ halftone }: SceneProps) {
  return (
    <G testID="cover-scene-generic">
      <G testID="cover-outlines" {...INK_PROPS}>
        <Rect
          x={0}
          y={0}
          width={200}
          height={112}
          fill={colors.background}
          stroke="none"
          opacity={0.4}
        />
        <Circle cx={100} cy={22} r={8} fill={colors.text} opacity={0.8} />
        <Block side="left" />
        <Block side="right" />
        <StreetLamp />
        <Path d="M0 128L76 112h48l76 16v22H0z" fill={colors.border} />
        <Path d="M100 112L60 150M100 112L140 150" strokeWidth={1.5} />
        <Path d="M100 118v6M100 130v8M100 142v8" strokeWidth={3} stroke={colors.warm} />
        <Shade id={halftone} x={0} y={130} width={200} height={20} />
        <Shade id={halftone} x={0} y={18} width={30} height={100} opacity={0.5} />
      </G>
    </G>
  );
}
