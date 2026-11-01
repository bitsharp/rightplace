import { colors, glow, heights, radius, spacing } from './tokens';
import { typography } from './typography';

// Dark-only for now (CLAUDE.md: dark-first); a hook keeps call sites ready for a light theme.
const theme = { colors, spacing, radius, heights, glow, typography } as const;

export type Theme = typeof theme;

export function useTheme(): Theme {
  return theme;
}
