import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { useNotificationStore } from '../store/notificationStore';
import { ActivityScreen } from './ActivityScreen';

const mockPush = jest.fn();
const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack, canGoBack: () => true, replace: jest.fn() }),
  useIsFocused: () => true,
}));

const ITEMS = [
  { kind: 'like', actor_handle: 'volpe.viola', post_id: 'p1', created_at: '2026-11-13T12:00:00Z' },
  {
    kind: 'follow_request',
    actor_handle: 'orso.grigio',
    post_id: null,
    created_at: '2026-11-13T11:00:00Z',
  },
  {
    kind: 'follow_accepted',
    actor_handle: 'gatto.nero',
    post_id: null,
    created_at: '2026-11-13T10:00:00Z',
  },
];

describe('ActivityScreen', () => {
  beforeEach(() => mockPush.mockClear());

  it('elenca like, richieste e accettazioni con l’handle di chi le ha fatte', async () => {
    setFakeRpc({ get_my_activity: ITEMS });
    await render(<ActivityScreen />, { wrapper: createQueryWrapper().Wrapper });
    expect(
      await screen.findByText('notifications:activity.items.like({"handle":"@volpe.viola"})'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('notifications:activity.items.follow_request({"handle":"@orso.grigio"})'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('notifications:activity.items.follow_accepted({"handle":"@gatto.nero"})'),
    ).toBeOnTheScreen();
  });

  it('all’apertura segna tutto come visto (il pallino della campanella si spegne)', async () => {
    setFakeRpc({ get_my_activity: ITEMS });
    await render(<ActivityScreen />, { wrapper: createQueryWrapper().Wrapper });
    await waitFor(() => expect(useNotificationStore.getState().activitySeenAt).not.toBeNull());
    expect((useNotificationStore.getState().activitySeenAt ?? '') >= '2026-11-13T12:00:00Z').toBe(
      true,
    );
  });

  it('un tap porta alla schermata giusta', async () => {
    setFakeRpc({ get_my_activity: ITEMS });
    await render(<ActivityScreen />, { wrapper: createQueryWrapper().Wrapper });
    await fireEvent.press(
      await screen.findByText(
        'notifications:activity.items.follow_accepted({"handle":"@gatto.nero"})',
      ),
    );
    expect(mockPush).toHaveBeenCalledWith('/u/gatto.nero');
    await fireEvent.press(
      screen.getByText('notifications:activity.items.follow_request({"handle":"@orso.grigio"})'),
    );
    expect(mockPush).toHaveBeenCalledWith('/friends');
  });

  it('il tocco sull’@handle di chi ha messo like apre il suo profilo, la riga resta sul feed', async () => {
    setFakeRpc({ get_my_activity: ITEMS });
    await render(<ActivityScreen />, { wrapper: createQueryWrapper().Wrapper });
    await fireEvent.press(
      await screen.findByRole('link', { name: 'ui:profileLink.open({"handle":"@volpe.viola"})' }),
    );
    expect(mockPush).toHaveBeenCalledWith('/u/volpe.viola');
    mockPush.mockClear();
    await fireEvent.press(
      screen.getByText('notifications:activity.items.like({"handle":"@volpe.viola"})'),
    );
    expect(mockPush).toHaveBeenCalledWith('/feed');
  });

  it('senza novità mostra lo stato vuoto', async () => {
    setFakeRpc({ get_my_activity: [] });
    await render(<ActivityScreen />, { wrapper: createQueryWrapper().Wrapper });
    expect(await screen.findByText('notifications:activity.empty')).toBeOnTheScreen();
  });
});
