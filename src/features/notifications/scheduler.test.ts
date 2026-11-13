import * as Notifications from 'expo-notifications';

import { permissionResponse } from '@/test/notificationFixtures';

import { DEFAULT_NOTIFICATION_PREFS } from './domain/prefs';
import {
  cancelDayAfterReminder,
  planLocalNotifications,
  syncLocalReminders,
  type ReminderContext,
} from './scheduler';

const schedule = jest.mocked(Notifications.scheduleNotificationAsync);
const cancel = jest.mocked(Notifications.cancelScheduledNotificationAsync);
const listScheduled = jest.mocked(Notifications.getAllScheduledNotificationsAsync);
const permissions = jest.mocked(Notifications.getPermissionsAsync);

const grant = () => permissions.mockResolvedValue(permissionResponse('granted'));

// Wednesday 2026-11-11, 11:00 in Rome
const context = (overrides: Partial<ReminderContext> = {}): ReminderContext => ({
  prefs: DEFAULT_NOTIFICATION_PREFS,
  timezone: 'Europe/Rome',
  now: new Date('2026-11-11T10:00:00Z'),
  declaration: null,
  postedNights: [],
  translate: (key) => `t:${key}`,
  ...overrides,
});

const scheduledIds = () => schedule.mock.calls.map(([request]) => request.identifier);

describe('planLocalNotifications', () => {
  it('pianifica un promemoria serata per ognuno dei prossimi 7 giorni, alle 18:00 della città', () => {
    const plan = planLocalNotifications(context());
    const evening = plan.filter((item) => item.id.startsWith('reminder:'));
    expect(evening.map((item) => item.id)).toEqual([
      'reminder:2026-11-11',
      'reminder:2026-11-12',
      'reminder:2026-11-13',
      'reminder:2026-11-14',
      'reminder:2026-11-15',
      'reminder:2026-11-16',
      'reminder:2026-11-17',
    ]);
    expect(evening[0]?.at.toISOString()).toBe('2026-11-11T17:00:00.000Z');
    expect(evening.every((item) => item.url === 'rightplace://map')).toBe(true);
  });

  it('il testo viene dal pool, scelto per data', () => {
    const [first] = planLocalNotifications(context());
    expect(first?.bodyKey).toMatch(/^reminder\.pool\.[0-3]$/);
  });

  it('non pianifica la serata se la categoria è spenta', () => {
    const plan = planLocalNotifications(
      context({ prefs: { ...DEFAULT_NOTIFICATION_PREFS, reminder: false } }),
    );
    expect(plan.filter((item) => item.id.startsWith('reminder:'))).toEqual([]);
  });

  it('rispetta giorni e ora delle preferenze', () => {
    const plan = planLocalNotifications(
      context({
        prefs: { ...DEFAULT_NOTIFICATION_PREFS, reminderDays: [5], reminderTime: '19:30' },
      }),
    );
    expect(plan.map((item) => [item.id, item.at.toISOString()])).toEqual([
      ['reminder:2026-11-13', '2026-11-13T18:30:00.000Z'],
    ]);
  });

  it('se ho già dichiarato la serata di stasera non c’è il promemoria di oggi', () => {
    // declaration of the night of 2026-11-11 expires at 06:00 on the 12th (05:00Z)
    const plan = planLocalNotifications(
      context({ declaration: { expiresAt: '2026-11-12T05:00:00Z' } }),
    );
    expect(plan.map((item) => item.id)).not.toContain('reminder:2026-11-11');
    expect(plan.map((item) => item.id)).toContain('reminder:2026-11-12');
  });

  it('se ho dichiarato una serata futura salta il promemoria di quel giorno', () => {
    const plan = planLocalNotifications(
      context({ declaration: { expiresAt: '2026-11-14T05:00:00Z' } }),
    );
    expect(plan.map((item) => item.id)).not.toContain('reminder:2026-11-13');
    expect(plan.map((item) => item.id)).toContain('reminder:2026-11-11');
  });

  it('con una dichiarazione pianifica "il giorno dopo" alle 11:00 verso il nuovo post', () => {
    const plan = planLocalNotifications(
      context({ declaration: { expiresAt: '2026-11-12T05:00:00Z' } }),
    );
    const dayAfter = plan.find((item) => item.id.startsWith('dayafter:'));
    expect(dayAfter).toMatchObject({
      id: 'dayafter:2026-11-11',
      url: 'rightplace://post/new',
      bodyKey: 'dayAfter.body',
    });
    expect(dayAfter?.at.toISOString()).toBe('2026-11-12T10:00:00.000Z');
  });

  it('non pianifica "il giorno dopo" se ho già postato quella serata o la categoria è spenta', () => {
    const declaration = { expiresAt: '2026-11-12T05:00:00Z' };
    expect(
      planLocalNotifications(context({ declaration, postedNights: ['2026-11-11'] })).some((item) =>
        item.id.startsWith('dayafter:'),
      ),
    ).toBe(false);
    expect(
      planLocalNotifications(
        context({ declaration, prefs: { ...DEFAULT_NOTIFICATION_PREFS, dayAfter: false } }),
      ).some((item) => item.id.startsWith('dayafter:')),
    ).toBe(false);
  });

  it('non pianifica "il giorno dopo" nel passato', () => {
    const plan = planLocalNotifications(
      context({
        declaration: { expiresAt: '2026-11-11T05:00:00Z' },
        now: new Date('2026-11-11T12:00:00Z'),
      }),
    );
    expect(plan.some((item) => item.id.startsWith('dayafter:'))).toBe(false);
  });
});

describe('syncLocalReminders', () => {
  beforeEach(() => {
    grant();
    listScheduled.mockResolvedValue([]);
  });

  it('programma le notifiche con identificatori stabili, trigger a data e canale promemoria', async () => {
    await syncLocalReminders(context({ declaration: { expiresAt: '2026-11-12T05:00:00Z' } }));
    expect(scheduledIds()).toContain('reminder:2026-11-12');
    expect(scheduledIds()).toContain('dayafter:2026-11-11');
    const first = schedule.mock.calls.find(([r]) => r.identifier === 'reminder:2026-11-12')?.[0];
    expect(first).toMatchObject({
      content: {
        body: expect.stringContaining('t:reminder.pool.'),
        data: { url: 'rightplace://map' },
      },
      trigger: { type: 'date', channelId: 'promemoria' },
    });
  });

  it('prima cancella i promemoria programmati in precedenza, e solo i propri', async () => {
    listScheduled.mockResolvedValue([
      { identifier: 'reminder:2026-11-10' },
      { identifier: 'dayafter:2026-11-09' },
      { identifier: 'altra-cosa' },
    ] as Awaited<ReturnType<typeof Notifications.getAllScheduledNotificationsAsync>>);
    await syncLocalReminders(context());
    expect(cancel).toHaveBeenCalledWith('reminder:2026-11-10');
    expect(cancel).toHaveBeenCalledWith('dayafter:2026-11-09');
    expect(cancel).not.toHaveBeenCalledWith('altra-cosa');
  });

  it('senza permesso non programma nulla, ma cancella quello che c’era', async () => {
    permissions.mockResolvedValue(permissionResponse('denied', false));
    listScheduled.mockResolvedValue([{ identifier: 'reminder:2026-11-12' }] as Awaited<
      ReturnType<typeof Notifications.getAllScheduledNotificationsAsync>
    >);
    await syncLocalReminders(context());
    expect(schedule).not.toHaveBeenCalled();
    expect(cancel).toHaveBeenCalledWith('reminder:2026-11-12');
  });
});

describe('cancelDayAfterReminder', () => {
  it('cancella solo "il giorno dopo" di quella serata', async () => {
    await cancelDayAfterReminder('2026-11-11');
    expect(cancel).toHaveBeenCalledTimes(1);
    expect(cancel).toHaveBeenCalledWith('dayafter:2026-11-11');
  });
});
