export type StatsSegment = 'going' | 'maybe' | 'all';

type Stats = { avgAge: number | null; femalePct: number | null; malePct: number | null };

export type StatsView =
  | { kind: 'visible'; avgAge: number; femalePct: number; malePct: number }
  | { kind: 'hidden'; segment: StatsSegment };

// k-anonymity (principle 2) is decided by the server: a null means "fewer than 3", and the
// client never recomputes or infers anything from the other segments.
export function statsView(stats: Stats, segment: StatsSegment): StatsView {
  const { avgAge, femalePct, malePct } = stats;
  if (avgAge === null || femalePct === null || malePct === null) return { kind: 'hidden', segment };
  return { kind: 'visible', avgAge, femalePct, malePct };
}
