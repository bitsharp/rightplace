import * as Notifications from 'expo-notifications';

import { stopDayAfterReminder } from './dayAfter';
import { resetNotificationState, useNotificationStore } from './store/notificationStore';

describe('stopDayAfterReminder', () => {
  beforeEach(() => resetNotificationState());

  it('dopo il post cancella il promemoria "giorno dopo" di quella serata e non lo ripianifica', () => {
    stopDayAfterReminder({
      nightDate: '2026-11-13',
      declarationExpiresAt: null,
      timezone: 'Europe/Rome',
    });
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'dayafter:2026-11-13',
    );
    expect(useNotificationStore.getState().postedNights).toEqual(['2026-11-13']);
  });

  it('per le serate di un creator (senza data) usa quella della mia dichiarazione', () => {
    stopDayAfterReminder({
      nightDate: null,
      declarationExpiresAt: '2026-11-14T01:00:00Z',
      timezone: 'Europe/Rome',
    });
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'dayafter:2026-11-13',
    );
    expect(useNotificationStore.getState().postedNights).toEqual(['2026-11-13']);
  });

  it('senza nessuna data non fa nulla', () => {
    stopDayAfterReminder({ nightDate: null, declarationExpiresAt: null, timezone: 'Europe/Rome' });
    expect(Notifications.cancelScheduledNotificationAsync).not.toHaveBeenCalled();
  });
});
