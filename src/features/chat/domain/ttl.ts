const HOUR_MS = 60 * 60 * 1000;
export const EXPIRY_WARNING_HOURS = 12;

// Whole hours left (rounded up) once fewer than 12 remain; otherwise the banner stays quiet.
export function chatExpiryHours(expiresAt: string, now: Date): number | null {
  const remaining = new Date(expiresAt).getTime() - now.getTime();
  if (remaining <= 0 || remaining >= EXPIRY_WARNING_HOURS * HOUR_MS) return null;
  return Math.ceil(remaining / HOUR_MS);
}
