import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { permissionResponse } from '@/test/notificationFixtures';
import { Linking } from 'react-native';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { NotificationSettings } from './NotificationSettings';

const mockSession: { profile: { isSupport: boolean } } = { profile: { isSupport: false } };
jest.mock('@/features/auth/useSession', () => ({ useSession: () => mockSession }));
const mockCreator = { showCreatorProfileLink: true };
jest.mock('@/features/creator/useCreatorUi', () => ({ useCreatorUi: () => mockCreator }));

const PREFS = {
  reminder: true,
  day_after: true,
  friends: true,
  chat: true,
  feed: true,
  creator: true,
  reminder_days: [0, 1, 2, 3, 4, 5, 6],
  reminder_time: '18:00',
};
const setCalls = () =>
  fakeSupabase.rpc.mock.calls.filter(([n]) => n === 'set_my_notification_prefs');

function seed(overrides: Record<string, unknown> = {}) {
  let stored = { ...PREFS, ...overrides };
  setFakeRpc({
    get_my_notification_prefs: () => stored,
    set_my_notification_prefs: (args: unknown) => {
      stored = { ...stored, ...(args as { p_prefs: object }).p_prefs };
      return stored;
    },
  });
}
const renderSettings = () =>
  render(<NotificationSettings />, { wrapper: createQueryWrapper().Wrapper });

describe('NotificationSettings', () => {
  beforeEach(() => {
    mockCreator.showCreatorProfileLink = true;
    mockSession.profile.isSupport = false;
    jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue(permissionResponse('granted'));
  });

  it('mostra un interruttore per categoria con lo stato salvato', async () => {
    seed({ chat: false });
    await renderSettings();
    const chat = await screen.findByRole('switch', {
      name: 'notifications:settings.categories.chat.title',
    });
    expect(chat.props.accessibilityState).toMatchObject({ checked: false });
    const feed = screen.getByRole('switch', {
      name: 'notifications:settings.categories.feed.title',
    });
    expect(feed.props.accessibilityState).toMatchObject({ checked: true });
  });

  it('spegnere "Chat e serate" salva solo quella preferenza', async () => {
    seed();
    await renderSettings();
    await fireEvent.press(
      await screen.findByRole('switch', { name: 'notifications:settings.categories.chat.title' }),
    );
    await waitFor(() =>
      expect(setCalls()).toEqual([['set_my_notification_prefs', { p_prefs: { chat: false } }]]),
    );
  });

  it('la categoria Messaggi è sempre visibile e si spegne da sola', async () => {
    seed();
    await renderSettings();
    await fireEvent.press(
      await screen.findByRole('switch', { name: 'notifications:settings.categories.dm.title' }),
    );
    await waitFor(() => expect(setCalls().at(-1)?.[1]).toEqual({ p_prefs: { dm: false } }));
  });

  it('la categoria Creator c’è solo se l’area creator è visibile', async () => {
    mockCreator.showCreatorProfileLink = false;
    seed();
    await renderSettings();
    await screen.findByRole('switch', { name: 'notifications:settings.categories.chat.title' });
    expect(
      screen.queryByRole('switch', { name: 'notifications:settings.categories.creator.title' }),
    ).toBeNull();
  });

  it('la categoria Feedback ricevuti compare solo per il supporto', async () => {
    seed({ support: true });
    await renderSettings();
    await screen.findByRole('switch', { name: 'notifications:settings.categories.chat.title' });
    expect(
      screen.queryByRole('switch', { name: 'notifications:settings.categories.support.title' }),
    ).toBeNull();
    await screen.unmount();

    mockSession.profile.isSupport = true;
    await renderSettings();
    await fireEvent.press(
      await screen.findByRole('switch', {
        name: 'notifications:settings.categories.support.title',
      }),
    );
    await waitFor(() => expect(setCalls().at(-1)?.[1]).toEqual({ p_prefs: { support: false } }));
  });

  it('i giorni del promemoria si scelgono con i chip', async () => {
    seed();
    await renderSettings();
    await fireEvent.press(
      await screen.findByRole('button', { name: 'notifications:settings.days.long.1' }),
    );
    await waitFor(() =>
      expect(setCalls().at(-1)?.[1]).toEqual({ p_prefs: { reminder_days: [0, 2, 3, 4, 5, 6] } }),
    );
  });

  it('l’ora del promemoria si sposta di 15 minuti', async () => {
    seed();
    await renderSettings();
    expect(await screen.findByText('18:00')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'notifications:settings.time.later' }),
    );
    await waitFor(() =>
      expect(setCalls().at(-1)?.[1]).toEqual({ p_prefs: { reminder_time: '18:15' } }),
    );
  });

  it('con le notifiche negate nel sistema rimanda alle impostazioni del telefono', async () => {
    seed();
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue(permissionResponse('denied', false));
    const open = jest.spyOn(Linking, 'openSettings').mockResolvedValue();
    await renderSettings();
    expect(await screen.findByText('notifications:settings.permission.denied')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'notifications:settings.permission.openSettings' }),
    );
    expect(open).toHaveBeenCalled();
    open.mockRestore();
  });

  it('se non ha ancora deciso offre di attivarle', async () => {
    seed();
    jest
      .mocked(Notifications.getPermissionsAsync)
      .mockResolvedValue(permissionResponse('undetermined'));
    await renderSettings();
    await fireEvent.press(
      await screen.findByRole('button', { name: 'notifications:settings.permission.enable' }),
    );
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
  });
});
