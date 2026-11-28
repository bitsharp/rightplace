export const USAGE_PAGE_SIZE = 50;
export const USAGE_PERIODS = [7, 30, 90] as const;
export type UsagePeriod = (typeof USAGE_PERIODS)[number];
export const DEFAULT_USAGE_PERIOD: UsagePeriod = 30;

export type UsageUser = {
  userId: string;
  handle: string;
  lastSeenAt: string;
  logins: number;
  sessions: number;
  totalMinutes: number;
  lastPlatform: 'ios' | 'android' | 'web' | null;
  lastAppVersion: string | null;
};

export type UsageEvent = {
  id: number;
  kind: 'login' | 'session';
  startedAt: string;
  endedAt: string | null;
  minutes: number;
  platform: 'ios' | 'android' | 'web' | null;
  appVersion: string | null;
};

// Keyset pagination on started_at: a full page means there may be older events.
export function nextUsageCursor(lastPage: readonly { startedAt: string }[]): string | undefined {
  return lastPage.length < USAGE_PAGE_SIZE ? undefined : lastPage.at(-1)?.startedAt;
}
