const MINUTE = 60;
const HOUR = 3600;
const DAY = 86_400;

function unit(value: number, name: 'hour' | 'minute', locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: name,
    unitDisplay: 'short',
  }).format(value);
}

// Time of use as "2 h 5 min" / "45 min", in the language of the interface.
export function formatMinutes(total: number, locale: string): string {
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  if (hours === 0) return unit(minutes, 'minute', locale);
  if (minutes === 0) return unit(hours, 'hour', locale);
  return `${unit(hours, 'hour', locale)} ${unit(minutes, 'minute', locale)}`;
}

// "2 hours ago": the last access, rounded down to minutes, hours or days.
export function formatSince(iso: string, now: Date, locale: string): string {
  const seconds = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 1000));
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (seconds < MINUTE) return format.format(0, 'minute');
  if (seconds < HOUR) return format.format(-Math.floor(seconds / MINUTE), 'minute');
  if (seconds < DAY) return format.format(-Math.floor(seconds / HOUR), 'hour');
  return format.format(-Math.floor(seconds / DAY), 'day');
}
