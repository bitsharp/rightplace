export type PermissionStatus = 'granted' | 'denied' | 'undetermined';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

type AskInput = { status: PermissionStatus; lastAskedAt: number | null; now: number };

// The system dialog can be shown once, so our own question comes first and at most once a week.
// "denied" means the system will not ask again: only Settings can change it.
export function shouldAskPermission({ status, lastAskedAt, now }: AskInput): boolean {
  if (status !== 'undetermined') return false;
  return lastAskedAt === null || now - lastAskedAt >= WEEK_MS;
}
