// Turnout is always shown as a band, never as an exact count (CLAUDE.md principle 2).
export const BANDS = ['pochi', '3–10', '10–20', '20–30', '30–50', '50–100', '100+'] as const;
export type Band = (typeof BANDS)[number];
export type Intent = 'going' | 'maybe';

const DIAMETERS: Record<Band, number> = {
  pochi: 44,
  '3–10': 48,
  '10–20': 56,
  '20–30': 64,
  '30–50': 72,
  '50–100': 100,
  '100+': 124,
};

export function bandRank(band: Band): number {
  return BANDS.indexOf(band);
}

export function hotSpotDiameter(band: Band): number {
  return DIAMETERS[band];
}

export function dominantIntent(going: Band, maybe: Band): Intent {
  return bandRank(maybe) > bandRank(going) ? 'maybe' : 'going';
}
