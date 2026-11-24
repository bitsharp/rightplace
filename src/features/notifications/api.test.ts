import { setFakeRpc, setFakeTable } from '@/test/fakeSupabase';

import {
  fetchActivity,
  fetchCityTimezone,
  fetchNotificationPrefs,
  registerPushToken,
  saveNotificationPrefs,
  unregisterPushToken,
} from './api';

const SERVER_PREFS = {
  reminder: true,
  day_after: true,
  friends: true,
  chat: false,
  feed: true,
  creator: true,
  reminder_days: [5, 6],
  reminder_time: '19:00',
};

describe('notifications api', () => {
  it('legge le preferenze e le traduce', async () => {
    setFakeRpc({ get_my_notification_prefs: SERVER_PREFS });
    await expect(fetchNotificationPrefs()).resolves.toMatchObject({
      chat: false,
      reminderDays: [5, 6],
      reminderTime: '19:00',
    });
  });

  it('salva solo le chiavi cambiate nel formato del server e restituisce le preferenze complete', async () => {
    const rpc = jest.fn(() => SERVER_PREFS);
    setFakeRpc({ set_my_notification_prefs: rpc });
    await expect(saveNotificationPrefs({ dayAfter: false })).resolves.toMatchObject({
      chat: false,
    });
    expect(rpc).toHaveBeenCalledWith({ p_prefs: { day_after: false } });
  });

  it('registra e rimuove il token del dispositivo', async () => {
    const register = jest.fn();
    const unregister = jest.fn();
    setFakeRpc({ register_push_token: register, unregister_push_token: unregister });
    await registerPushToken('ExponentPushToken[abc]', 'ios');
    await unregisterPushToken('ExponentPushToken[abc]');
    expect(register).toHaveBeenCalledWith({ p_token: 'ExponentPushToken[abc]', p_platform: 'ios' });
    expect(unregister).toHaveBeenCalledWith({ p_token: 'ExponentPushToken[abc]' });
  });

  it('legge le novità senza alcun testo dei commenti', async () => {
    setFakeRpc({
      get_my_activity: [
        {
          kind: 'like',
          actor_handle: 'volpe.viola',
          actor_id: 'u-volpe.viola',
          post_id: 'p1',
          created_at: '2026-11-13T10:00:00Z',
        },
        {
          kind: 'follow_request',
          actor_handle: 'orso.grigio',
          actor_id: 'u-orso.grigio',
          post_id: null,
          created_at: '2026-11-13T11:00:00Z',
        },
      ],
    });
    await expect(fetchActivity()).resolves.toEqual([
      {
        kind: 'like',
        actorHandle: 'volpe.viola',
        actorId: 'u-volpe.viola',
        postId: 'p1',
        createdAt: '2026-11-13T10:00:00Z',
      },
      {
        kind: 'follow_request',
        actorHandle: 'orso.grigio',
        actorId: 'u-orso.grigio',
        postId: null,
        createdAt: '2026-11-13T11:00:00Z',
      },
    ]);
  });

  it('rifiuta un tipo di novità sconosciuto', async () => {
    setFakeRpc({
      get_my_activity: [
        {
          kind: 'boh',
          actor_handle: 'x.y',
          actor_id: 'u-x.y',
          post_id: null,
          created_at: '2026-11-13T10:00:00Z',
        },
      ],
    });
    await expect(fetchActivity()).rejects.toThrow();
  });

  it('legge il fuso della città dal catalogo', async () => {
    setFakeTable('cities', [{ slug: 'milano', timezone: 'Europe/Rome' }]);
    await expect(fetchCityTimezone('milano')).resolves.toBe('Europe/Rome');
  });

  it('senza città nota usa il fuso di Milano', async () => {
    setFakeTable('cities', []);
    await expect(fetchCityTimezone('altrove')).resolves.toBe('Europe/Rome');
  });
});
