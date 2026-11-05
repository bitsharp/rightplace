import { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

import { Avatar, type AvatarIntent } from '@/components/ui/Avatar';
import { colors } from '@/theme/tokens';

const SIZE = 64;
const RING = 3;

type Props = {
  initial: string;
  tone: AvatarIntent;
  seen: boolean;
};

// Story ring from TopBar.dc.html: violet→cyan gradient while there is something new, plain border once seen.
export function StoryAvatar({ initial, tone, seen }: Props) {
  const gradientId = `ring${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={styles.box}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.going} />
            <Stop offset="1" stopColor={colors.maybe} />
          </LinearGradient>
        </Defs>
        <Circle
          testID={seen ? 'story-ring-seen' : 'story-ring-new'}
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={SIZE / 2 - RING / 2}
          stroke={seen ? colors.border : `url(#${gradientId})`}
          strokeWidth={RING}
          fill="none"
        />
      </Svg>
      <Avatar intent={tone} initial={initial} size={SIZE - RING * 4} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
});
