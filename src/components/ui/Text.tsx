import { Text as RNText, type TextProps } from 'react-native';

import { colors, type ColorToken } from '@/theme/tokens';
import { typography, type TypographyVariant } from '@/theme/typography';

type Props = TextProps & {
  variant?: TypographyVariant;
  color?: ColorToken;
};

export function Text({ variant = 'body15', color = 'text', style, ...rest }: Props) {
  return <RNText style={[typography[variant], { color: colors[color] }, style]} {...rest} />;
}
