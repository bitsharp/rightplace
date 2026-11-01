import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import type { ColorToken } from '@/theme/tokens';

import { Text } from './Text';

export type LabelTone = 'going' | 'maybe' | 'muted';

const TONE_COLOR: Record<LabelTone, ColorToken> = {
  going: 'going',
  maybe: 'maybe',
  muted: 'textSecondary',
};

type Props = {
  children: ReactNode;
  tone?: LabelTone;
  size?: 'small' | 'medium' | 'large';
};

const SIZE_VARIANT = { small: 'label10', medium: 'label11', large: 'label12' } as const;

export function MonoLabel({ children, tone = 'muted', size = 'small' }: Props) {
  return (
    <Text variant={SIZE_VARIANT[size]} color={TONE_COLOR[tone]} style={styles.label}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({ label: { textTransform: 'uppercase' } });
