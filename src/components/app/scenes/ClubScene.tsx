import { Circle, G, Path, Polygon, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

import { INK_PROPS, Shade, type SceneProps } from './shared';

function Beams() {
  return (
    <G stroke="none">
      <Polygon points="30,0 50,0 96,92 20,92" fill={colors.primary} opacity={0.28} />
      <Polygon points="86,0 114,0 130,92 70,92" fill={colors.secondary} opacity={0.22} />
      <Polygon points="150,0 170,0 190,92 110,92" fill={colors.primary} opacity={0.22} />
    </G>
  );
}

function DiscoBall() {
  return (
    <G>
      <Path d="M28 0V14" />
      <Circle cx={28} cy={26} r={12} fill={colors.text} />
      <Path d="M16 26h24M28 14v24M19 20c6 3 12 3 18 0M19 32c6-3 12-3 18 0" strokeWidth={1.5} />
    </G>
  );
}

// The DJ behind the decks, a headphone band on the head.
function DjBooth() {
  return (
    <G>
      <Circle cx={100} cy={44} r={9} fill={colors.ink} />
      <Path d="M91 44a9 9 0 0 1 18 0" stroke={colors.warm} />
      <Path d="M84 78c0-16 6-24 16-24s16 8 16 24z" fill={colors.ink} />
      <Rect x={68} y={76} width={64} height={14} rx={2} fill={colors.border} />
      <Circle cx={84} cy={83} r={5} fill={colors.surface} />
      <Circle cx={116} cy={83} r={5} fill={colors.surface} />
      <Rect x={95} y={79} width={10} height={6} fill={colors.warm} />
    </G>
  );
}

// People seen from behind: round heads, shoulders, a few raised arms.
function Crowd() {
  const heads = [14, 44, 76, 108, 140, 170, 196] as const;
  return (
    <G>
      {heads.map((x, i) => {
        const y = 118 + (i % 2) * 8;
        return (
          <G key={x}>
            <Path d={`M${x - 14} 152c0-14 6-20 14-20s14 6 14 20z`} fill={colors.ink} />
            <Circle cx={x} cy={y} r={8} fill={colors.ink} />
            {i % 3 === 0 ? <Path d={`M${x + 8} ${y + 8}l8-18`} strokeWidth={4} /> : null}
          </G>
        );
      })}
    </G>
  );
}

// A dance floor in perspective under coloured beams, a disco ball and the DJ booth.
export function ClubScene({ halftone }: SceneProps) {
  return (
    <G testID="cover-scene-club">
      <G testID="cover-outlines" {...INK_PROPS}>
        <Rect x={0} y={0} width={200} height={92} fill={colors.surface} stroke="none" />
        <Beams />
        <DiscoBall />
        <DjBooth />
        <Path d="M0 92h200v58H0z" fill={colors.border} />
        <Path
          d="M100 92L40 150M100 92L160 150M100 92v58M100 92L0 124M100 92L200 124"
          strokeWidth={1.5}
        />
        <Shade id={halftone} x={0} y={92} width={200} height={24} />
        <Circle cx={60} cy={110} r={9} fill={colors.maybeSoft} stroke="none" />
        <Circle cx={150} cy={104} r={7} fill={colors.goingSoft} stroke="none" />
        <Crowd />
      </G>
    </G>
  );
}
