import {
  instantFromWallTime,
  shiftWallTime,
  wallTimeIn,
  type WallTime,
} from '@/features/creator/domain/zonedTime';

const DAY_MINUTES = 24 * 60;
const NIGHT_CHANGE_MINUTES = 6 * 60;
const DAY_AFTER_HOUR = 11;
const DEFAULT_HORIZON_DAYS = 7;

const pad = (value: number) => String(value).padStart(2, '0');
const dateKeyOf = (wall: WallTime) => `${wall.year}-${pad(wall.month)}-${pad(wall.day)}`;

export function localDateKey(instant: Date, timeZone: string): string {
  return dateKeyOf(wallTimeIn(instant, timeZone));
}

function parseDateKey(dateKey: string): WallTime {
  const [year = 0, month = 0, day = 0] = dateKey.split('-').map(Number);
  return { year, month, day, hour: 0, minute: 0 };
}

const weekdayOf = (wall: WallTime) =>
  new Date(Date.UTC(wall.year, wall.month - 1, wall.day)).getUTCDay();

// A declaration (and an event) ends at 06:00 after its night at the latest: one minute before that
// 6-hour shift, the local date is the night's own date, whatever hour the event ended.
export function nightDateOf(expiresAt: Date, timeZone: string): string {
  const shifted = new Date(expiresAt.getTime() - (NIGHT_CHANGE_MINUTES + 1) * 60 * 1000);
  return localDateKey(shifted, timeZone);
}

// "How was last night?" arrives at 11:00 local on the day after the night.
export function dayAfterReminderDate(nightDate: string, timeZone: string): Date {
  const next = shiftWallTime(parseDateKey(nightDate), DAY_MINUTES);
  return instantFromWallTime({ ...next, hour: DAY_AFTER_HOUR, minute: 0 }, timeZone);
}

export type ReminderInput = {
  days: readonly number[];
  time: string;
  timezone: string;
  now: Date;
  declaredToday: boolean;
  horizonDays?: number;
};

// Evening reminders for the next `horizonDays` local dates, as UTC instants: only the chosen weekdays,
// never today when the user has already declared or the hour has passed.
export function nextReminderDates(input: ReminderInput): Date[] {
  const [hour = 0, minute = 0] = input.time.split(':').map(Number);
  const today = { ...wallTimeIn(input.now, input.timezone), hour: 0, minute: 0 };
  const dates: Date[] = [];
  for (let offset = 0; offset < (input.horizonDays ?? DEFAULT_HORIZON_DAYS); offset += 1) {
    const day = shiftWallTime(today, offset * DAY_MINUTES);
    if (!input.days.includes(weekdayOf(day))) continue;
    const at = instantFromWallTime({ ...day, hour, minute }, input.timezone);
    const skipToday = offset === 0 && (input.declaredToday || at.getTime() <= input.now.getTime());
    if (!skipToday) dates.push(at);
  }
  return dates;
}
