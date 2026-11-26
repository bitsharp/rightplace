import { bandRank, type Band } from '@/features/nights/domain/band';

// How "hot" a hot spot looks: the busiest venues light up, the quiet ones stay discreet so the map is readable.
// Real and server-side turnout are treated the same (principle 2: only bands, never counts).
export type HotSpotTier = 'low' | 'mid' | 'high';

const FIRST_MID = bandRank('10–20');
const FIRST_HIGH = bandRank('30–50');

export function hotSpotTier(goingBand: Band, maybeBand: Band): HotSpotTier {
  const rank = Math.max(bandRank(goingBand), bandRank(maybeBand), 0);
  if (rank >= FIRST_HIGH) return 'high';
  if (rank >= FIRST_MID) return 'mid';
  return 'low';
}
