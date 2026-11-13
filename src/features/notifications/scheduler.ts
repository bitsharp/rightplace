import * as Notifications from 'expo-notifications';

import type { NotificationPrefs } from './domain/prefs';
import { reminderTextKey } from './domain/reminderTexts';
import {
  dayAfterReminderDate,
  localDateKey,
  nextReminderDates,
  nightDateOf,
} from './domain/reminders';

const EVENING_PREFIX = 'reminder:';
const DAY_AFTER_PREFIX = 'dayafter:';
const CHANNEL = 'promemoria';

export type ReminderContext = {
  prefs: NotificationPrefs;
  // IANA zone of the user's city: reminders follow the city's clock, not the phone's
  timezone: string;
  now: Date;
  // My own declaration (active or ended less than 24 h ago), as the server returns it
  declaration: { expiresAt: string } | null;
  postedNights: readonly string[];
  // `notifications` namespace translator, passed in so this file knows nothing about i18n setup
  translate: (key: string) => string;
};

type Planned = { id: string; at: Date; bodyKey: string; url: string };

function eveningReminders(context: ReminderContext, declaredNight: string | null): Planned[] {
  const { prefs, timezone, now } = context;
  if (!prefs.reminder) return [];
  return nextReminderDates({
    days: prefs.reminderDays,
    time: prefs.reminderTime,
    timezone,
    now,
    declaredToday: declaredNight === localDateKey(now, timezone),
  })
    .map((at) => ({ at, dateKey: localDateKey(at, timezone) }))
    .filter(({ dateKey }) => dateKey !== declaredNight)
    .map(({ at, dateKey }) => ({
      id: `${EVENING_PREFIX}${dateKey}`,
      at,
      bodyKey: reminderTextKey(dateKey),
      url: 'rightplace://map',
    }));
}

function dayAfterReminder(context: ReminderContext, declaredNight: string | null): Planned[] {
  const { prefs, timezone, now, postedNights } = context;
  if (!prefs.dayAfter || declaredNight === null || postedNights.includes(declaredNight)) return [];
  const at = dayAfterReminderDate(declaredNight, timezone);
  if (at.getTime() <= now.getTime()) return [];
  return [
    {
      id: `${DAY_AFTER_PREFIX}${declaredNight}`,
      at,
      bodyKey: 'dayAfter.body',
      url: 'rightplace://post/new',
    },
  ];
}

// Pure: what should be on the phone's schedule right now.
export function planLocalNotifications(context: ReminderContext): Planned[] {
  const declaredNight = context.declaration
    ? nightDateOf(new Date(context.declaration.expiresAt), context.timezone)
    : null;
  return [...eveningReminders(context, declaredNight), ...dayAfterReminder(context, declaredNight)];
}

const isOurs = (id: string) => id.startsWith(EVENING_PREFIX) || id.startsWith(DAY_AFTER_PREFIX);

async function cancelOurs(): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter(({ identifier }) => isOurs(identifier))
      .map(({ identifier }) => Notifications.cancelScheduledNotificationAsync(identifier)),
  );
}

async function schedulePlanned(item: Planned, context: ReminderContext): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: item.id,
    content: {
      title: context.translate('reminder.title'),
      body: context.translate(item.bodyKey),
      data: { url: item.url },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: item.at,
      channelId: CHANNEL,
    },
  });
}

let queue: Promise<void> = Promise.resolve();

// Cancels and re-plans every reminder of ours. Runs one at a time: it is called from several places
// (launch, foreground, declaring, preferences) that can overlap.
export function syncLocalReminders(context: ReminderContext): Promise<void> {
  const run = async () => {
    await cancelOurs();
    const { granted } = await Notifications.getPermissionsAsync();
    if (!granted) return;
    for (const item of planLocalNotifications(context)) await schedulePlanned(item, context);
  };
  queue = queue.then(run, run);
  return queue;
}

export async function cancelDayAfterReminder(nightDate: string): Promise<void> {
  await Notifications.cancelScheduledNotificationAsync(`${DAY_AFTER_PREFIX}${nightDate}`);
}

export async function cancelAllLocalReminders(): Promise<void> {
  await cancelOurs();
}
