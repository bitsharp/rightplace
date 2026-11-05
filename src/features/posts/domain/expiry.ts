const DAY_MS = 24 * 60 * 60 * 1000;

// Whole days left, rounded up: "SCADE TRA 1 GG" until the very end, 0 only once it is gone (principle 5).
export function expiresInDays(expiresAt: string, now: Date): number {
  const left = new Date(expiresAt).getTime() - now.getTime();
  if (!(left > 0)) return 0;
  return Math.ceil(left / DAY_MS);
}
