import { z } from 'zod';

import { callRpc } from '@/lib/callRpc';

import { usageContext } from './context';
import { USAGE_PAGE_SIZE, type UsageEvent, type UsageUser } from './domain/types';

const platformSchema = z.enum(['ios', 'android', 'web']).nullable();

const overviewSchema = z.array(
  z.object({
    user_id: z.string(),
    handle: z.string(),
    last_seen_at: z.string(),
    logins: z.number().int(),
    sessions: z.number().int(),
    total_minutes: z.number().int(),
    last_platform: platformSchema,
    last_app_version: z.string().nullable(),
  }),
);

const eventsSchema = z.array(
  z.object({
    id: z.number().int(),
    kind: z.enum(['login', 'session']),
    started_at: z.string(),
    last_seen_at: z.string(),
    ended_at: z.string().nullable(),
    minutes: z.number().int(),
    platform: platformSchema,
    app_version: z.string().nullable(),
  }),
);

const sessionIdSchema = z.number().int().nullable();

function rpcArgs() {
  const { platform, appVersion } = usageContext();
  return { p_platform: platform, p_app_version: appVersion };
}

export async function startUsageSession(): Promise<number | null> {
  return sessionIdSchema.parse(await callRpc<unknown>('start_usage_session', rpcArgs()));
}

export async function touchUsageSession(id: number): Promise<void> {
  await callRpc('touch_usage_session', { p_id: id });
}

export async function endUsageSession(id: number): Promise<void> {
  await callRpc('end_usage_session', { p_id: id });
}

// Fire and forget: a failed record must never get in the way of signing in.
export async function logLogin(): Promise<void> {
  try {
    await callRpc('log_login', rpcArgs());
  } catch (error) {
    console.warn('usage login log failed', error);
  }
}

// Admin only: any other caller gets NOT_ADMIN from the server.
export async function fetchUsageOverview(days: number, search: string): Promise<UsageUser[]> {
  const data = await callRpc<unknown>('get_usage_overview', {
    p_days: days,
    p_search: search === '' ? null : search,
  });
  return overviewSchema.parse(data).map((row) => ({
    userId: row.user_id,
    handle: row.handle,
    lastSeenAt: row.last_seen_at,
    logins: row.logins,
    sessions: row.sessions,
    totalMinutes: row.total_minutes,
    lastPlatform: row.last_platform,
    lastAppVersion: row.last_app_version,
  }));
}

export async function fetchUserUsage(
  userId: string,
  before: string | undefined,
): Promise<UsageEvent[]> {
  const data = await callRpc<unknown>('get_user_usage', {
    p_user: userId,
    p_before: before ?? null,
    p_limit: USAGE_PAGE_SIZE,
  });
  return eventsSchema.parse(data).map((row) => ({
    id: row.id,
    kind: row.kind,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    minutes: row.minutes,
    platform: row.platform,
    appVersion: row.app_version,
  }));
}
