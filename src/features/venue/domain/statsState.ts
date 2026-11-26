export type StatsSegment = 'going' | 'maybe' | 'all';

type Stats = {
  avgAge: number | null;
  femalePct: number | null;
  malePct: number | null;
  isEstimate?: boolean;
};

export type StatsView =
  | { kind: 'visible'; avgAge: number; femalePct: number; malePct: number }
  // estimate: the bands include estimated presence, so a plain 'fewer than 3' would mislead (only real people count).
  | { kind: 'hidden'; segment: StatsSegment; estimate: boolean };

// k-anonymity (principle 2) is decided by the server: a null means "fewer than 3", and the
// client never recomputes or infers anything from the other segments.
export function statsView(stats: Stats, segment: StatsSegment): StatsView {
  const { avgAge, femalePct, malePct } = stats;
  if (avgAge === null || femalePct === null || malePct === null)
    return { kind: 'hidden', segment, estimate: stats.isEstimate ?? false };
  return { kind: 'visible', avgAge, femalePct, malePct };
}
