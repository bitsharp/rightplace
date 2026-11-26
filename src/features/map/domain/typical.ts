// "Di solito" layer (CLAUDE.md principle 11): a qualitative level, never a number shown to people.
export const TYPICAL_LEVELS = [0, 1, 2, 3] as const;
export type TypicalLevel = (typeof TYPICAL_LEVELS)[number];
export type VisibleTypicalLevel = 1 | 2 | 3;

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
