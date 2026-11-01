import type { TextStyle } from 'react-native';

import { fonts } from './tokens';

const display = (fontSize: number): TextStyle => ({
  fontFamily: fonts.display,
  fontSize,
  lineHeight: Math.round(fontSize * 1.2),
});
const body = (fontSize: number, fontFamily: string = fonts.body): TextStyle => ({
  fontFamily,
  fontSize,
  lineHeight: Math.round(fontSize * 1.4),
});
const label = (fontSize: number, letterSpacing: number): TextStyle => ({
  fontFamily: fonts.mono,
  fontSize,
  letterSpacing,
});

export const typography = {
  display30: display(30),
  display26: display(26),
  display24: display(24),
  display22: display(22),
  display17: display(17),
  body16: body(16),
  body16Strong: body(16, fonts.bodyStrong),
  body15: body(15),
  body15Strong: body(15, fonts.bodyStrong),
  body14: body(14),
  body14Medium: body(14, fonts.bodyMedium),
  body13: body(13),
  body13Medium: body(13, fonts.bodyMedium),
  body12: body(12),
  body11Medium: body(11, fonts.bodyMedium),
  label12: label(12, 1.5),
  label11: label(11, 1.2),
  label10: label(10, 1.2),
} as const satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof typography;
