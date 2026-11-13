import { renderHook } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { notificationResponse } from '@/test/notificationFixtures';

import { useNotificationRouting } from './useNotificationRouting';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

describe('useNotificationRouting', () => {
  beforeEach(() => {
    mockPush.mockClear();
    jest.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValue(null);
  });

  it('da app chiusa: la notifica che l’ha aperta porta alla schermata giusta', async () => {
    jest
      .mocked(Notifications.getLastNotificationResponseAsync)
      .mockResolvedValueOnce(notificationResponse('rightplace://night/abc/chat', 'cold'));
    await renderHook(() => useNotificationRouting(true));
    await new Promise((resolve) => setImmediate(resolve));
    expect(mockPush).toHaveBeenCalledWith('/night/abc/chat');
  });

  it('in background o in primo piano: ascolta i tap e instrada', async () => {
    await renderHook(() => useNotificationRouting(true));
    const listener = jest.mocked(Notifications.addNotificationResponseReceivedListener).mock
      .calls[0]?.[0];
    listener?.(notificationResponse('rightplace://feed', 'bg'));
    expect(mockPush).toHaveBeenCalledWith('/feed');
  });

  it('non instrada due volte la stessa notifica', async () => {
    jest
      .mocked(Notifications.getLastNotificationResponseAsync)
      .mockResolvedValueOnce(notificationResponse('rightplace://creator', 'same'));
    await renderHook(() => useNotificationRouting(true));
    await new Promise((resolve) => setImmediate(resolve));
    const listener = jest.mocked(Notifications.addNotificationResponseReceivedListener).mock
      .calls[0]?.[0];
    listener?.(notificationResponse('rightplace://creator', 'same'));
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('un URL sconosciuto apre la mappa', async () => {
    await renderHook(() => useNotificationRouting(true));
    const listener = jest.mocked(Notifications.addNotificationResponseReceivedListener).mock
      .calls[0]?.[0];
    listener?.(notificationResponse('rightplace://boh', 'x'));
    expect(mockPush).toHaveBeenCalledWith('/map');
  });

  it('prima che la sessione sia pronta non instrada e non ascolta', async () => {
    await renderHook(() => useNotificationRouting(false));
    expect(Notifications.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
