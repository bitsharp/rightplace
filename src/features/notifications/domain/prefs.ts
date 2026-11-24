import { z } from 'zod';

export const NOTIFICATION_CATEGORIES = [
  'reminder',
  'dayAfter',
  'friends',
  'chat',
  'feed',
  'creator',
  'support',
  'dm',
] as const;
export type NotificationCategory = (typeof NOTIFICATION_CATEGORIES)[number];

export type NotificationPrefs = Record<NotificationCategory, boolean> & {
  // 0 = Sunday … 6 = Saturday, sorted
  reminderDays: number[];
  // "HH:MM" local time of the city, 15-minute steps
  reminderTime: string;
};

// Same defaults as `private.default_notification_prefs()` on the server.
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  reminder: true,
  dayAfter: true,
  friends: true,
  chat: true,
  feed: true,
  creator: true,
  support: true,
  dm: true,
  reminderDays: [0, 1, 2, 3, 4, 5, 6],
  reminderTime: '18:00',
};

const serverPrefsSchema = z.object({
  reminder: z.boolean(),
  day_after: z.boolean(),
  friends: z.boolean(),
  chat: z.boolean(),
  feed: z.boolean(),
  creator: z.boolean(),
  // only present for support accounts (set by the user); the server default has no such key
  support: z.boolean().optional(),
  // absent until the server migration for direct messages is applied
  dm: z.boolean().optional(),
  reminder_days: z.array(z.number().int().min(0).max(6)),
  reminder_time: z.string().regex(/^([01]\d|2[0-3]):(00|15|30|45)$/),
});

export function parseNotificationPrefs(raw: unknown): NotificationPrefs {
  const row = serverPrefsSchema.parse(raw);
  return {
    reminder: row.reminder,
    dayAfter: row.day_after,
    friends: row.friends,
    chat: row.chat,
    feed: row.feed,
    creator: row.creator,
    support: row.support ?? true,
    dm: row.dm ?? true,
    reminderDays: [...row.reminder_days].sort((a, b) => a - b),
    reminderTime: row.reminder_time,
  };
}

// Wire format of `set_my_notification_prefs`: only the keys that change.
export function toServerPrefs(patch: Partial<NotificationPrefs>): Record<string, unknown> {
  const { dayAfter, reminderDays, reminderTime, ...rest } = patch;
  return {
    ...rest,
    ...(dayAfter === undefined ? {} : { day_after: dayAfter }),
    ...(reminderDays === undefined ? {} : { reminder_days: reminderDays }),
    ...(reminderTime === undefined ? {} : { reminder_time: reminderTime }),
  };
}
