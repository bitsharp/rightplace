import { act, renderHook, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { permissionResponse } from '@/test/notificationFixtures';

import { setFakeRpc, setFakeTable } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import {
  useActivity,
  useMarkRoomRead,
  useNotificationPrefs,
  useReminderSync,
  useSaveNotificationPrefs,
  useUnreadChatCount,
  useUnseenActivityCount,
} from './hooks';
import { resetNotificationState, useNotificationStore } from './store/notificationStore';

jest.mock('expo-router', () => ({ useIsFocused: () => true }));
jest.mock('@/features/auth/useSession', () => ({
  useSession: () => ({ userId: 'me', profile: { handle: 'lince.rosso' } }),
}));

const SERVER_PREFS = {
  reminder: true,
  day_after: true,
  friends: true,
  chat: true,
  feed: true,
  creator: true,
  reminder_days: [0, 1, 2, 3, 4, 5, 6],
  reminder_time: '18:00',
};
const ROOM = {
  room_id: 'r1',
  venue_id: 'v1',
  venue_name: 'Arena',
  event_id: null,
  event_name: null,
  expires_at: '2026-11-15T05:00:00Z',
  friends_inside: 1,
  photo_count: 0,
  last_kind: 'text',
  last_text: 'ciao',
  last_handle: 'volpe.viola',
  last_at: '2026-11-13T21:00:00Z',
};
const LIKE = {
  kind: 'like',
  actor_handle: 'volpe.viola',
  post_id: 'p1',
  created_at: '2026-11-13T10:00:00Z',
};

beforeEach(() => resetNotificationState());

describe('preferences', () => {
  it('le legge dal server', async () => {
    setFakeRpc({ get_my_notification_prefs: { ...SERVER_PREFS, chat: false } });
    const { result } = await renderHook(() => useNotificationPrefs(), {
      wrapper: createQueryWrapper().Wrapper,
    });
    await waitFor(() => expect(result.current.data?.chat).toBe(false));
  });

  it('salva la modifica: la cache cambia subito e il server riceve solo quella chiave', async () => {
    let stored = SERVER_PREFS;
    const save = jest.fn(() => {
      stored = { ...SERVER_PREFS, chat: false };
      return stored;
    });
    setFakeRpc({ get_my_notification_prefs: () => stored, set_my_notification_prefs: save });
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(
      () => ({ prefs: useNotificationPrefs(), save: useSaveNotificationPrefs() }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.prefs.data).toBeDefined());
    await act(async () => result.current.save.mutate({ chat: false }));
    await waitFor(() => expect(result.current.prefs.data?.chat).toBe(false));
    expect(save).toHaveBeenCalledWith({ p_prefs: { chat: false } });
  });
});

describe('indicatori in-app', () => {
  it('le novità non viste accendono il pallino finché non vengono segnate come viste', async () => {
    setFakeRpc({ get_my_activity: [LIKE] });
    const { result } = await renderHook(
      () => ({ items: useActivity(), unseen: useUnseenActivityCount() }),
      { wrapper: createQueryWrapper().Wrapper },
    );
    await waitFor(() => expect(result.current.unseen).toBe(1));
    await act(async () => useNotificationStore.getState().markActivitySeen('2026-11-13T10:00:00Z'));
    await waitFor(() => expect(result.current.unseen).toBe(0));
  });

  it('il badge Chat conta le stanze con messaggi altrui non letti', async () => {
    setFakeRpc({ get_my_chat_rooms: [ROOM] });
    const { result } = await renderHook(() => useUnreadChatCount(), {
      wrapper: createQueryWrapper().Wrapper,
    });
    await waitFor(() => expect(result.current).toBe(1));
    await act(async () =>
      useNotificationStore.getState().markRoomRead('r1', '2026-11-13T22:00:00Z'),
    );
    await waitFor(() => expect(result.current).toBe(0));
  });

  it('aprire una stanza la segna letta: l’istante è almeno quello dell’ultimo messaggio', async () => {
    const { rerender } = await renderHook(
      ({ latest }: { latest: string | null }) => useMarkRoomRead('r1', latest),
      { initialProps: { latest: '2099-01-01T00:00:00Z' } },
    );
    expect(useNotificationStore.getState().chatLastReadAt.r1).toBe('2099-01-01T00:00:00Z');
    await rerender({ latest: '2099-01-02T00:00:00Z' });
    expect(useNotificationStore.getState().chatLastReadAt.r1).toBe('2099-01-02T00:00:00Z');
  });

  it('una stanza senza messaggi si segna letta con l’ora del telefono', async () => {
    await renderHook(() => useMarkRoomRead('r2', null));
    expect(useNotificationStore.getState().chatLastReadAt.r2).toBeDefined();
  });
});

describe('useReminderSync', () => {
  const grant = () =>
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permissionResponse('granted'));

  it('programma i promemoria quando preferenze, dichiarazione e fuso sono noti', async () => {
    grant();
    setFakeRpc({ get_my_notification_prefs: SERVER_PREFS, get_my_declaration: [] });
    setFakeTable('cities', [{ slug: 'milano', timezone: 'Europe/Rome' }]);
    await renderHook(() => useReminderSync(true), { wrapper: createQueryWrapper().Wrapper });
    await waitFor(() => expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled());
    const ids = jest
      .mocked(Notifications.scheduleNotificationAsync)
      .mock.calls.map(([r]) => r.identifier);
    expect(ids.every((id) => id?.startsWith('reminder:'))).toBe(true);
  });

  it('non fa nulla finché la sessione non è pronta', async () => {
    grant();
    setFakeRpc({ get_my_notification_prefs: SERVER_PREFS, get_my_declaration: [] });
    setFakeTable('cities', [{ slug: 'milano', timezone: 'Europe/Rome' }]);
    await renderHook(() => useReminderSync(false), { wrapper: createQueryWrapper().Wrapper });
    await act(async () => undefined);
    expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
  });
});
