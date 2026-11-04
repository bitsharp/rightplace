// "Di solito" layer (CLAUDE.md principle 11): a qualitative level, never a number shown to people.
export const TYPICAL_LEVELS = [0, 1, 2, 3] as const;
export type TypicalLevel = (typeof TYPICAL_LEVELS)[number];
export type VisibleTypicalLevel = 1 | 2 | 3;

// Always smaller than the smallest hot spot (44) so the grey layer never reads as "stasera".
const DIAMETERS: Record<VisibleTypicalLevel, number> = { 1: 14, 2: 20, 3: 28 };

export function typicalDotDiameter(level: VisibleTypicalLevel): number {
  return DIAMETERS[level];
}

export type TypicalLabelKey = 'quiet' | 'lively' | 'packed';

const LABEL_KEYS: Record<VisibleTypicalLevel, TypicalLabelKey> = {
  1: 'quiet',
  2: 'lively',
  3: 'packed',
};

export function typicalLabelKey(level: VisibleTypicalLevel): TypicalLabelKey {
  return LABEL_KEYS[level];
}

export function isVisibleTypical(level: TypicalLevel): level is VisibleTypicalLevel {
  return level >= 1;
}
