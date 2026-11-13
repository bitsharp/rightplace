import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { configureForegroundBehavior, ensureAndroidChannels, ANDROID_CHANNELS } from './setup';

const handler = () => {
  const calls = jest.mocked(Notifications.setNotificationHandler).mock.calls;
  const registered = calls[calls.length - 1]?.[0];
  if (!registered) throw new Error('handler not registered');
  return registered.handleNotification;
};
const notification = (url?: string) =>
  ({ request: { content: { data: url ? { url } : {} } } }) as Parameters<
    ReturnType<typeof handler>
  >[0];

describe('foreground behavior', () => {
  it('mostra banner, lista e suono con l’app aperta', async () => {
    configureForegroundBehavior(() => '/map');
    await expect(handler()(notification('rightplace://night/abc/chat'))).resolves.toMatchObject({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
    });
  });

  it('non mostra nulla se sono già nella schermata di destinazione', async () => {
    configureForegroundBehavior(() => '/night/abc/chat');
    await expect(handler()(notification('rightplace://night/abc/chat'))).resolves.toMatchObject({
      shouldShowBanner: false,
      shouldShowList: false,
      shouldPlaySound: false,
    });
  });

  it('legge il percorso corrente al momento della notifica, non prima', async () => {
    let path = '/map';
    configureForegroundBehavior(() => path);
    path = '/night/abc/chat';
    await expect(handler()(notification('rightplace://night/abc/chat'))).resolves.toMatchObject({
      shouldShowBanner: false,
    });
  });
});

describe('ensureAndroidChannels', () => {
  const names = { promemoria: 'P', amici: 'A', chat: 'C', feed: 'F', creator: 'K' };

  it('crea i cinque canali su Android con i nomi tradotti', async () => {
    Platform.OS = 'android';
    await ensureAndroidChannels(names);
    const ids = jest.mocked(Notifications.setNotificationChannelAsync).mock.calls.map(([id]) => id);
    expect(ids).toEqual([...ANDROID_CHANNELS]);
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
      'chat',
      expect.objectContaining({ name: 'C' }),
    );
  });

  it('su iOS non fa nulla', async () => {
    Platform.OS = 'ios';
    await ensureAndroidChannels(names);
    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
  });
});
