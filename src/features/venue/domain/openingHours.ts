import { z } from 'zod';

const MINUTES_PER_DAY = 24 * 60;
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

const pointSchema = z.object({
  day: z.number().int().min(0).max(6),
  hour: z.number().int().min(0).max(23),
  minute: z.number().int().min(0).max(59).default(0),
});

// Google Places regularOpeningHours: day 0 = Sunday; a period without `close` is open 24 hours.
const hoursSchema = z.object({
  periods: z.array(z.object({ open: pointSchema, close: pointSchema.optional() })),
});

type Shift = { opensAt: number; closesAt: number; closeClock: string };

const weekMinute = (point: z.infer<typeof pointSchema>) =>
  point.day * MINUTES_PER_DAY + point.hour * 60 + point.minute;

const clock = (point: z.infer<typeof pointSchema>) =>
  `${String(point.hour).padStart(2, '0')}:${String(point.minute).padStart(2, '0')}`;

function toShifts(periods: z.infer<typeof hoursSchema>['periods']): Shift[] {
  return periods.flatMap(({ open, close }) => {
    if (!close) return [];
    const opensAt = weekMinute(open);
    const closesAt = weekMinute(close);
    // A close at or before the open belongs to the following day (or week).
    return [
      {
        opensAt,
        closesAt: closesAt > opensAt ? closesAt : closesAt + MINUTES_PER_WEEK,
        closeClock: clock(close),
      },
    ];
  });
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Minutes since Sunday 00:00 on the wall clock of the venue's city, not of the device.
function localWeekMinute(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? '0';
  return (
    WEEKDAYS.indexOf(read('weekday')) * MINUTES_PER_DAY +
    Number(read('hour')) * 60 +
    Number(read('minute'))
  );
}

const isOpenAt = (shift: Shift, minute: number) =>
  [minute, minute + MINUTES_PER_WEEK].some((at) => shift.opensAt <= at && at < shift.closesAt);

// Opens later today: same weekday as now, after now.
const opensLaterToday = (shift: Shift, minute: number) =>
  shift.opensAt > minute &&
  Math.floor(shift.opensAt / MINUTES_PER_DAY) === Math.floor(minute / MINUTES_PER_DAY);

export function closingTimeTonight(
  openingHours: unknown,
  now: Date,
  timeZone: string,
): string | null {
  const parsed = hoursSchema.safeParse(openingHours);
  if (!parsed.success) return null;
  const shifts = toShifts(parsed.data.periods);
  const minute = localWeekMinute(now, timeZone);
  const current = shifts.find((shift) => isOpenAt(shift, minute));
  if (current) return current.closeClock;
  return shifts.find((shift) => opensLaterToday(shift, minute))?.closeClock ?? null;
}
