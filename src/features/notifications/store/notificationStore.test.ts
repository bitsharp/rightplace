import {
  resetNotificationState,
  useNotificationStore,
  MAX_TRACKED_ROOMS,
} from './notificationStore';

describe('notificationStore', () => {
  beforeEach(() => resetNotificationState());

  it('segna le novità come viste con un istante', () => {
    useNotificationStore.getState().markActivitySeen('2026-11-13T12:00:00Z');
    expect(useNotificationStore.getState().activitySeenAt).toBe('2026-11-13T12:00:00Z');
  });

  it('ricorda l’ultima lettura per stanza senza mai tornare indietro', () => {
    const { markRoomRead } = useNotificationStore.getState();
    markRoomRead('r1', '2026-11-13T22:00:00Z');
    markRoomRead('r1', '2026-11-13T21:00:00Z');
    expect(useNotificationStore.getState().chatLastReadAt).toEqual({ r1: '2026-11-13T22:00:00Z' });
  });

  it('tiene traccia solo delle stanze più recenti', () => {
    const { markRoomRead } = useNotificationStore.getState();
    for (let i = 0; i < MAX_TRACKED_ROOMS + 5; i += 1) {
      markRoomRead(`r${i}`, new Date(Date.UTC(2026, 10, 1, 0, i)).toISOString());
    }
    const rooms = Object.keys(useNotificationStore.getState().chatLastReadAt);
    expect(rooms).toHaveLength(MAX_TRACKED_ROOMS);
    expect(rooms).not.toContain('r0');
    expect(rooms).toContain(`r${MAX_TRACKED_ROOMS + 4}`);
  });

  it('ricorda le serate già postate una volta sola', () => {
    const { markNightPosted } = useNotificationStore.getState();
    markNightPosted('2026-11-13');
    markNightPosted('2026-11-13');
    expect(useNotificationStore.getState().postedNights).toEqual(['2026-11-13']);
  });

  it('reset cancella tutto ciò che appartiene all’utente precedente', () => {
    const state = useNotificationStore.getState();
    state.markActivitySeen('2026-11-13T12:00:00Z');
    state.markRoomRead('r1', '2026-11-13T22:00:00Z');
    state.markNightPosted('2026-11-13');
    state.setPushToken('ExponentPushToken[x]');
    state.setPermissionAskedAt(123);
    resetNotificationState();
    expect(useNotificationStore.getState()).toMatchObject({
      activitySeenAt: null,
      chatLastReadAt: {},
      postedNights: [],
      pushToken: null,
      permissionAskedAt: null,
    });
  });
});
