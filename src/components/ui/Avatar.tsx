import { StyleSheet, View } from 'react-native';

import { colors, fonts } from '@/theme/tokens';

import { Text } from './Text';

export type AvatarIntent = 'going' | 'maybe' | 'neutral';

type Props = {
  intent: AvatarIntent;
  initial?: string;
  size?: number;
};

const INTENT_COLORS: Record<AvatarIntent, { borderColor: string; backgroundColor: string }> = {
  going: { borderColor: colors.going, backgroundColor: colors.goingSoft },
  maybe: { borderColor: colors.maybe, backgroundColor: colors.maybeSoft },
  neutral: { borderColor: colors.border, backgroundColor: colors.neutralSoft },
};

export function Avatar({ intent, initial, size = 44 }: Props) {
  return (
    <View
      testID="avatar"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        INTENT_COLORS[intent],
      ]}
    >
      {initial ? (
        <Text style={[styles.initial, { fontSize: Math.round(size * 0.36) }]}>
          {initial.toUpperCase()}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  initial: { fontFamily: fonts.display, lineHeight: undefined },
});
