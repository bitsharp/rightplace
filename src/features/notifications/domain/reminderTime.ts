const STEP_MINUTES = 15;
const DAY_MINUTES = 24 * 60;

// Monday first, like the week on the phone's calendar; values are 0 = Sunday … 6 = Saturday.
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

export function stepReminderTime(time: string, direction: 1 | -1 | 15 | -15): string {
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  const delta = (direction > 0 ? 1 : -1) * STEP_MINUTES;
  const total = (hour * 60 + minute + delta + DAY_MINUTES) % DAY_MINUTES;
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(Math.floor(total / 60))}:${pad(total % 60)}`;
}

export function toggleDay(days: readonly number[], day: number): number[] {
  const next = days.includes(day) ? days.filter((d) => d !== day) : [...days, day];
  return next.sort((a, b) => a - b);
}
