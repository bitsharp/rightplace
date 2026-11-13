import * as Notifications from 'expo-notifications';

import { fakeSupabase } from '@/test/fakeSupabase';

import { prepareForSignOut } from './signOutCleanup';
import { resetNotificationState, useNotificationStore } from './store/notificationStore';

describe('prepareForSignOut', () => {
  beforeEach(() => resetNotificationState());

  it('toglie il dispositivo dall’account: dopo l’uscita le push non arrivano più a questo telefono', async () => {
    useNotificationStore.getState().setPushToken('ExponentPushToken[abc]');
    await prepareForSignOut();
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('unregister_push_token', {
      p_token: 'ExponentPushToken[abc]',
    });
  });

  it('senza token registrato non chiama il server', async () => {
    await prepareForSignOut();
    expect(fakeSupabase.rpc).not.toHaveBeenCalled();
  });

  it('cancella i promemoria locali e lo stato dell’utente che esce', async () => {
    jest
      .mocked(Notifications.getAllScheduledNotificationsAsync)
      .mockResolvedValueOnce([
        { identifier: 'reminder:2026-11-13' },
        { identifier: 'dayafter:2026-11-13' },
      ] as Awaited<ReturnType<typeof Notifications.getAllScheduledNotificationsAsync>>);
    useNotificationStore.getState().markActivitySeen('2026-11-13T12:00:00Z');
    useNotificationStore.getState().setPushToken('ExponentPushToken[abc]');
    await prepareForSignOut();
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'reminder:2026-11-13',
    );
    expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
      'dayafter:2026-11-13',
    );
    expect(useNotificationStore.getState()).toMatchObject({
      activitySeenAt: null,
      pushToken: null,
    });
  });

  it('un errore di rete non impedisce di uscire e non scrive il token nei log', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    useNotificationStore.getState().setPushToken('ExponentPushToken[abc]');
    fakeSupabase.rpc.mockRejectedValueOnce(new TypeError('Network request failed'));
    await expect(prepareForSignOut()).resolves.toBeUndefined();
    expect(warn.mock.calls.flat().join(' ')).not.toContain('ExponentPushToken');
    expect(useNotificationStore.getState().pushToken).toBeNull();
    warn.mockRestore();
  });
});
