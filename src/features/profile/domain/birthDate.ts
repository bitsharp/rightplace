type DateParts = { day: string; month: string; year: string };

const pad = (value: number) => String(value).padStart(2, '0');

export function parseBirthDate({ day, month, year }: DateParts): string | null {
  if (![day, month].every((part) => /^\d{1,2}$/.test(part)) || !/^\d{4}$/.test(year)) return null;
  const [d, m, y] = [Number(day), Number(month), Number(year)];
  if (y < 1900) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  const exists =
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  return exists ? `${y}-${pad(m)}-${pad(d)}` : null;
}

// Same rule as SQL is_adult(): 18th birthday reached today counts (CLAUDE.md principle 8).
export function isAdultOn(isoBirthDate: string, today: Date): boolean {
  const [y = 0, m = 1, d = 1] = isoBirthDate.split('-').map(Number);
  const eighteenth = new Date(y + 18, m - 1, d);
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return eighteenth.getTime() <= todayStart.getTime();
}
