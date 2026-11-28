const MINUTE = 60;
const HOUR = 3600;
const DAY = 86_400;

// A translation key plus its parameters: the domain stays pure, the component calls `t`.
// No Intl.RelativeTimeFormat / NumberFormat `style: 'unit'` here: Hermes (the app on device) lacks them
// and crashes, while Node (jest) has them.
export type Phrase = { key: string; params: Record<string, number> };

// Postgres sends microseconds ("…:00.123456+00:00"); not every engine parses more than 3 fraction digits.
export function parseTimestamp(iso: string): Date | null {
  const date = new Date(iso.replace(/(\.\d{3})\d+/, '$1'));
  return Number.isNaN(date.getTime()) ? null : date;
}

// Time of use as "2 h 5 min" / "45 min".
export function describeMinutes(total: number): Phrase {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return { key: 'usage.duration.minutes', params: { count: minutes } };
  if (minutes === 0) return { key: 'usage.duration.hours', params: { count: hours } };
  return { key: 'usage.duration.hoursMinutes', params: { hours, minutes } };
}

// "2 hours ago": the last access, rounded down to minutes, hours or days.
export function describeSince(iso: string, now: Date): Phrase {
  const at = parseTimestamp(iso);
  const seconds = at ? Math.max(0, Math.floor((now.getTime() - at.getTime()) / 1000)) : 0;
  if (seconds < MINUTE) return { key: 'usage.since.now', params: {} };
  if (seconds < HOUR) {
    return { key: 'usage.since.minutes', params: { count: Math.floor(seconds / MINUTE) } };
  }
  if (seconds < DAY) {
    return { key: 'usage.since.hours', params: { count: Math.floor(seconds / HOUR) } };
  }
  const days = Math.floor(seconds / DAY);
  if (days === 1) return { key: 'usage.since.yesterday', params: {} };
  return { key: 'usage.since.days', params: { count: days } };
}
