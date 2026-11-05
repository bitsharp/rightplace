export type NightLabel =
  { key: 'none' } | { key: 'tonight' } | { key: 'lastNight' } | { key: 'daysAgo'; days: number };

const NIGHT_CUTOFF_HOURS = 6;
const DAY_MS = 24 * 60 * 60 * 1000;

function dayNumber(year: number, month: number, day: number): number {
  return Math.round(Date.UTC(year, month, day) / DAY_MS);
}

// A night runs from 06:00 to 06:00 (device calendar, close enough to the city's): before 06:00 "today's
// night" is still yesterday's date. The text itself comes from i18n (plurals); this only picks the key.
export function nightLabelKey(nightDate: string | null, now: Date): NightLabel {
  const match = nightDate?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return { key: 'none' };
  const current = new Date(now.getTime() - NIGHT_CUTOFF_HOURS * 3_600_000);
  const today = dayNumber(current.getFullYear(), current.getMonth(), current.getDate());
  const night = dayNumber(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const days = today - night;
  if (days <= 0) return { key: 'tonight' };
  if (days === 1) return { key: 'lastNight' };
  return { key: 'daysAgo', days };
}
