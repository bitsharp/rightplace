import { shiftWallTime, wallTimeIn } from './zonedTime';

export type WhenLabel = {
  day: 'tonight' | 'tomorrow' | 'date';
  // Weekday and day of month in the user's language; only for day = 'date'.
  date: string;
  time: string;
  endTime: string;
};

const NIGHT_CHANGE_MINUTES = 6 * 60;
const DAY_MS = 24 * 60 * 60 * 1000;

// The night's date changes at 06:00 local, like on the server: 01:00 still belongs to "yesterday".
function nightDayIndex(instant: Date, timeZone: string): number {
  const { year, month, day } = shiftWallTime(wallTimeIn(instant, timeZone), -NIGHT_CHANGE_MINUTES);
  return Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
}

const clock = (instant: Date, timeZone: string, locale: string) =>
  new Intl.DateTimeFormat(locale, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(instant);

function dayOf(starts: Date, now: Date, timeZone: string): WhenLabel['day'] {
  const distance = nightDayIndex(starts, timeZone) - nightDayIndex(now, timeZone);
  if (distance === 0) return 'tonight';
  return distance === 1 ? 'tomorrow' : 'date';
}

// Same night as `now` (the date changes at 06:00): what the map shows as "stasera".
export function isTonight(startsAt: string, now: Date, timeZone: string): boolean {
  return dayOf(new Date(startsAt), now, timeZone) === 'tonight';
}

// Times are the city's wall clock (not the device's), day words follow the night, not midnight.
export function eventWhenLabel(
  startsAt: string,
  endsAt: string,
  now: Date,
  timeZone: string,
  locale: string,
): WhenLabel {
  const starts = new Date(startsAt);
  const day = dayOf(starts, now, timeZone);
  return {
    day,
    date:
      day === 'date'
        ? new Intl.DateTimeFormat(locale, {
            timeZone,
            weekday: 'short',
            day: 'numeric',
            month: 'short',
          }).format(starts)
        : '',
    time: clock(starts, timeZone, locale),
    endTime: clock(new Date(endsAt), timeZone, locale),
  };
}

// Same rule as update_event: until the event starts, and never once cancelled.
export function canEdit(
  event: { startsAt: string; cancelledAt: string | null },
  now: Date,
): boolean {
  return event.cancelledAt === null && new Date(event.startsAt) > now;
}
