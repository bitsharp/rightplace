import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

export type CardTone = 'default' | 'going' | 'maybe' | 'dashed';

type Props = ViewProps & {
  children?: ReactNode;
  tone?: CardTone;
};

const TONES = {
  default: { borderColor: colors.border },
  going: { borderColor: colors.goingBorder },
  maybe: { borderColor: colors.maybe },
  dashed: { borderColor: colors.border, borderStyle: 'dashed' },
} as const;

export function Card({ children, tone = 'default', style, ...rest }: Props) {
  return (
    <View style={[styles.card, TONES[tone], style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderRadius: radius.card,
    padding: spacing.md + 2,
  },
});
