// Wall-clock arithmetic in a city's time zone with Intl only (no date library). The server decides
// with the same rule: a night runs 06:00 → 06:00 local, so the date changes at 06:00 (night_end).
export type WallTime = { year: number; month: number; day: number; hour: number; minute: number };

const MINUTE_MS = 60 * 1000;
const NIGHT_CHANGE_MINUTES = 6 * 60;

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  });
}

export function wallTimeIn(instant: Date, timeZone: string): WallTime {
  const parts = formatterFor(timeZone).formatToParts(instant);
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
  };
}

const asUtc = (wall: WallTime) =>
  Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);

function offsetMs(instant: Date, timeZone: string): number {
  const wholeMinute = Math.floor(instant.getTime() / MINUTE_MS) * MINUTE_MS;
  return asUtc(wallTimeIn(new Date(wholeMinute), timeZone)) - wholeMinute;
}

// Two passes: the offset of the first guess may sit on the other side of a DST change.
export function instantFromWallTime(wall: WallTime, timeZone: string): Date {
  const naive = asUtc(wall);
  const first = naive - offsetMs(new Date(naive), timeZone);
  return new Date(naive - offsetMs(new Date(first), timeZone));
}

export function shiftWallTime(wall: WallTime, minutes: number): WallTime {
  const shifted = new Date(asUtc(wall) + minutes * MINUTE_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

// 06:00 local after the night that `startsAt` belongs to: the latest an event may end.
export function nightEndOf(startsAt: Date, timeZone: string): Date {
  const nightStart = shiftWallTime(wallTimeIn(startsAt, timeZone), -NIGHT_CHANGE_MINUTES);
  const nextMorning = shiftWallTime(
    { ...nightStart, hour: 0, minute: 0 },
    24 * 60 + NIGHT_CHANGE_MINUTES,
  );
  return instantFromWallTime(nextMorning, timeZone);
}
