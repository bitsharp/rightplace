import { DEFAULT_NOTIFICATION_PREFS, parseNotificationPrefs, toServerPrefs } from './prefs';

describe('parseNotificationPrefs', () => {
  it('accetta le preferenze di default del server (18:00, ogni giorno, tutto attivo)', () => {
    const serverDefaults = {
      reminder: true,
      day_after: true,
      friends: true,
      chat: true,
      feed: true,
      creator: true,
      reminder_days: [0, 1, 2, 3, 4, 5, 6],
      reminder_time: '18:00',
    };
    expect(parseNotificationPrefs(serverDefaults)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(DEFAULT_NOTIFICATION_PREFS.support).toBe(true);
    expect(DEFAULT_NOTIFICATION_PREFS.reminderTime).toBe('18:00');
    expect(DEFAULT_NOTIFICATION_PREFS.reminderDays).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it('traduce le chiavi snake_case del server e ordina i giorni', () => {
    const parsed = parseNotificationPrefs({
      reminder: true,
      day_after: false,
      friends: true,
      chat: false,
      feed: true,
      creator: false,
      reminder_days: [6, 4, 5],
      reminder_time: '19:30',
    });
    expect(parsed).toEqual({
      reminder: true,
      dayAfter: false,
      friends: true,
      chat: false,
      feed: true,
      creator: false,
      support: true,
      reminderDays: [4, 5, 6],
      reminderTime: '19:30',
    });
  });

  it('la categoria support (solo per il supporto) è letta quando c’è', () => {
    const base = {
      reminder: true,
      day_after: true,
      friends: true,
      chat: true,
      feed: true,
      creator: true,
      reminder_days: [0],
      reminder_time: '18:00',
    };
    expect(parseNotificationPrefs({ ...base, support: false }).support).toBe(false);
    expect(toServerPrefs({ support: false })).toEqual({ support: false });
  });

  it('rifiuta un contenuto che non rispetta il contratto', () => {
    expect(() => parseNotificationPrefs({ reminder: 'sì' })).toThrow();
    expect(() => parseNotificationPrefs(null)).toThrow();
  });
});

describe('toServerPrefs', () => {
  it('invia solo le chiavi cambiate, nel formato del server', () => {
    expect(
      toServerPrefs({ chat: false, dayAfter: false, reminderTime: '19:00', reminderDays: [5] }),
    ).toEqual({
      chat: false,
      day_after: false,
      reminder_time: '19:00',
      reminder_days: [5],
    });
    expect(toServerPrefs({ feed: true })).toEqual({ feed: true });
  });
});
