import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';

import { colors } from '@/theme/tokens';

export type WelcomeArtKind = 'where' | 'declare' | 'privacy';

const WIDTH = 240;
const HEIGHT = 140;

// Map with grey "usually" dots and violet "tonight" hot spots.
function WhereArt() {
  return (
    <>
      <Rect x={0} y={0} width={WIDTH} height={HEIGHT} rx={20} fill={colors.mapCanvas} />
      <Circle cx={50} cy={90} r={8} fill={colors.typicalDot} />
      <Circle cx={95} cy={40} r={6} fill={colors.typicalDot} />
      <Circle cx={190} cy={100} r={10} fill={colors.typicalDot} />
      <Circle cx={140} cy={70} r={26} fill={colors.goingSoft} />
      <Circle cx={140} cy={70} r={14} fill={colors.going} />
      <Circle cx={200} cy={38} r={16} fill={colors.goingSoft} />
      <Circle cx={200} cy={38} r={8} fill={colors.going} />
    </>
  );
}

// "I'm going" (violet) and "Maybe" (cyan) side by side, with the three taps as dots above.
function DeclareArt() {
  return (
    <>
      <Circle cx={90} cy={22} r={5} fill={colors.textSecondary} />
      <Circle cx={120} cy={22} r={5} fill={colors.textSecondary} />
      <Circle cx={150} cy={22} r={5} fill={colors.going} />
      <Rect x={14} y={50} width={100} height={64} rx={16} fill={colors.goingTint} />
      <Rect x={14} y={50} width={100} height={64} rx={16} stroke={colors.going} strokeWidth={2} />
      <Rect x={126} y={50} width={100} height={64} rx={16} fill={colors.maybeTint} />
      <Rect x={126} y={50} width={100} height={64} rx={16} stroke={colors.maybe} strokeWidth={2} />
      <Circle cx={64} cy={82} r={10} fill={colors.going} />
      <Circle cx={176} cy={82} r={10} fill={colors.maybe} />
    </>
  );
}

// A padlock-like shield: ranges instead of exact numbers.
function PrivacyArt() {
  return (
    <>
      <Rect x={30} y={30} width={26} height={80} rx={8} fill={colors.goingSoft} />
      <Rect x={70} y={55} width={26} height={55} rx={8} fill={colors.maybeSoft} />
      <Rect x={110} y={75} width={26} height={35} rx={8} fill={colors.neutralSoft} />
      <Line x1={24} y1={118} x2={150} y2={118} stroke={colors.border} strokeWidth={2} />
      <Rect x={168} y={62} width={46} height={44} rx={10} fill={colors.surface} />
      <Rect x={168} y={62} width={46} height={44} rx={10} stroke={colors.primary} strokeWidth={2} />
      <Circle cx={191} cy={80} r={6} fill={colors.primary} />
      <Rect x={188} y={82} width={6} height={14} rx={3} fill={colors.primary} />
      <Rect x={178} y={36} width={26} height={30} rx={13} stroke={colors.primary} strokeWidth={3} />
    </>
  );
}

const ART: Record<WelcomeArtKind, () => React.JSX.Element> = {
  where: WhereArt,
  declare: DeclareArt,
  privacy: PrivacyArt,
};

// Decorative: the text of the page says everything, so the screen reader skips it.
export function WelcomeArt({ kind }: { kind: WelcomeArtKind }) {
  const Art = ART[kind];
  return (
    <View
      testID={`welcome-art-${kind}`}
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={styles.frame}
    >
      <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Art />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ frame: { alignItems: 'center' } });
