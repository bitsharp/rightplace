export const REMINDER_POOL_SIZE = 4;

const DAY_MS = 24 * 60 * 60 * 1000;

// i18n keys in the `notifications` namespace (`reminder.pool.0` is "Dove vai stasera? Dichiaralo e vedi chi c'è").
// Deterministic per date so a re-schedule never changes the text of a notification already planned.
export function reminderTextKey(dateKey: string): string {
  const [year = 0, month = 1, day = 1] = dateKey.split('-').map(Number);
  const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / DAY_MS);
  return `reminder.pool.${dayNumber % REMINDER_POOL_SIZE}`;
}
