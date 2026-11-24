import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { useNotificationStore } from '@/features/notifications/store/notificationStore';
import { notificationResponse } from '@/test/notificationFixtures';
import { renderApp } from '@/test/appFlows';
import { seedChatBackend, type FakeMessage } from '@/test/chatBackend';
import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import type { FakeUser } from '@/test/friendsBackend';

const VOLPE: FakeUser = { id: 'u-volpe', handle: 'volpe.viola' };
const ARENA = { room_id: 'r1', venue_id: 'arena', venue_name: 'Arena Club' };
const message = (id: string, user: FakeUser, text: string): FakeMessage => ({
  id,
  user_id: user.id,
  handle: user.handle,
  text,
  created_at: '2026-11-07T22:05:00Z',
});
const seedUnreadRoom = () =>
  seedChatBackend({
    rooms: [ARENA],
    messages: [message('m1', VOLPE, 'ci vediamo alle 11')],
    users: [VOLPE],
    accepted: ['u-volpe'],
  });

describe('indicatori in-app', () => {
  it('la tab Chat mostra quante stanze hanno messaggi non letti, indipendentemente dal permesso push', async () => {
    seedUnreadRoom();
    await renderApp('ready', '/chat');
    expect(await screen.findByTestId('tab-badge-chat')).toBeOnTheScreen();
  });

  it('aprire la stanza la segna letta e il badge sparisce', async () => {
    seedUnreadRoom();
    await renderApp('ready', '/chat');
    await screen.findByTestId('tab-badge-chat');
    await fireEvent.press(screen.getByText('Arena Club'));
    await waitFor(() => expect(useNotificationStore.getState().chatLastReadAt.r1).toBeDefined());
  });

  it('la campanella ha il pallino per una novità non vista e apre "Novità"', async () => {
    setFakeRpc({
      get_my_activity: [
        {
          kind: 'like',
          actor_handle: 'volpe.viola',
          actor_id: 'u-volpe.viola',
          post_id: 'p1',
          created_at: '2026-11-13T10:00:00Z',
        },
      ],
    });
    await renderApp('ready', '/map');
    expect(await screen.findByTestId('news-dot')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'ui:topBar.news' }));
    expect(
      await screen.findByText('notifications:activity.items.like({"handle":"@volpe.viola"})'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'notifications:activity.title' })).toBeOnTheScreen();
  });
});

describe('tap sulle notifiche', () => {
  it('da app chiusa apre la chat della stanza indicata dalla notifica', async () => {
    seedUnreadRoom();
    jest
      .mocked(Notifications.getLastNotificationResponseAsync)
      .mockResolvedValueOnce(notificationResponse('rightplace://night/r1/chat', 'cold-start'));
    await renderApp('ready', '/map');
    expect(
      await screen.findByRole('header', { name: 'chat:venueTitle({"venue":"Arena Club"})' }),
    ).toBeOnTheScreen();
  });

  it('il link rightplace://friends/requests apre la tab Amici', async () => {
    await renderApp('ready', '/friends/requests');
    expect(await screen.findByRole('tab', { name: /friends/, selected: true })).toBeOnTheScreen();
  });
});

describe('preferenze e promemoria', () => {
  it('l’app legge le preferenze del server all’avvio', async () => {
    await renderApp('ready', '/map');
    await waitFor(() =>
      expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_my_notification_prefs', undefined),
    );
  });
});
