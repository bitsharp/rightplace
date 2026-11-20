import { fireEvent, screen } from '@testing-library/react-native';

import { renderApp } from '@/test/appFlows';
import { fakeSupabase } from '@/test/fakeSupabase';
import { seedFeedBackend, type FakePost } from '@/test/feedBackend';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
}));

const VOLPE = { id: 'u-volpe', handle: 'volpe.viola', age_band: '25-34', gender: 'female' };
const theirs = (id: string, overrides: Partial<FakePost> = {}): FakePost => ({
  post_id: id,
  author_id: 'u-volpe',
  author_handle: 'volpe.viola',
  has_photo: true,
  caption: `didascalia ${id}`,
  ...overrides,
});

const signUrls = (avatars: string[] = []) =>
  fakeSupabase.functions.invoke.mockImplementation(async (name: string, options?: unknown) => {
    const body = (options as { body: { postIds?: string[]; userIds?: string[] } }).body;
    if (name === 'avatar-urls') {
      const ids = (body.userIds ?? []).filter((id) => avatars.includes(id));
      return {
        data: { urls: ids.map((userId) => ({ userId, url: `https://signed.test/a/${userId}` })) },
        error: null,
      };
    }
    const ids = body.postIds ?? [];
    return {
      data: { urls: ids.map((postId) => ({ postId, url: `https://signed.test/${postId}` })) },
      error: null,
    };
  });

describe('profilo pubblico in stile Instagram', () => {
  beforeEach(() => signUrls());

  it('uno sconosciuto vede identità pubblica, contatori nascosti e il lucchetto: nessun post richiesto', async () => {
    seedFeedBackend({
      users: [VOLPE],
      summaries: { 'u-volpe': { follow_state: 'none' } },
      userPosts: { 'u-volpe': [theirs('p1')] },
    });
    await renderApp('ready', '/u/volpe.viola');
    expect(await screen.findByText('@volpe.viola')).toBeOnTheScreen();
    expect(await screen.findByText('friends:publicProfile.privateTitle')).toBeOnTheScreen();
    expect(screen.getAllByText('–')).toHaveLength(3);
    expect(screen.queryByLabelText('didascalia p1')).toBeNull();
    expect(fakeSupabase.rpc.mock.calls.filter(([name]) => name === 'get_user_posts')).toHaveLength(
      0,
    );
    expect(
      screen.getByRole('button', { name: 'ui:follow.a11yRequest({"handle":"@volpe.viola"})' }),
    ).toBeOnTheScreen();
  });

  it('con la richiesta in attesa il lucchetto resta e il bottone dice “Richiesta inviata”', async () => {
    seedFeedBackend({
      users: [VOLPE],
      summaries: { 'u-volpe': { follow_state: 'pending' } },
    });
    await renderApp('ready', '/u/volpe.viola');
    expect(await screen.findByText('friends:publicProfile.privateTitle')).toBeOnTheScreen();
    expect(screen.queryByLabelText('didascalia p1')).toBeNull();
  });

  it('chi seguo (accettato) vede contatori, foto profilo e la griglia dei post visibili', async () => {
    signUrls(['u-volpe']);
    seedFeedBackend({
      users: [VOLPE],
      accepted: ['u-volpe'],
      summaries: {
        'u-volpe': {
          follow_state: 'accepted',
          followers_count: 12,
          following_count: 30,
          posts_count: 2,
        },
      },
      userPosts: {
        'u-volpe': [theirs('p1'), theirs('p2', { has_photo: false, caption: 'solo parole' })],
      },
    });
    await renderApp('ready', '/u/volpe.viola');
    expect(await screen.findByLabelText('didascalia p1')).toBeOnTheScreen();
    expect(screen.getByText('solo parole')).toBeOnTheScreen();
    expect(screen.getByText('12')).toBeOnTheScreen();
    expect(screen.getByText('30')).toBeOnTheScreen();
    expect(screen.queryByText('friends:publicProfile.privateTitle')).toBeNull();
    expect(
      await screen.findByTestId('avatar-image', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it('i contatori degli altri non aprono le liste (sono solo numeri)', async () => {
    seedFeedBackend({
      users: [VOLPE],
      accepted: ['u-volpe'],
      summaries: {
        'u-volpe': {
          follow_state: 'accepted',
          followers_count: 12,
          following_count: 30,
          posts_count: 0,
        },
      },
    });
    await renderApp('ready', '/u/volpe.viola');
    await screen.findByText('12');
    expect(screen.queryByRole('button', { name: /profile:header.a11yFollowers/ })).toBeNull();
  });

  it('un seguito senza post mostra lo stato vuoto, non il lucchetto', async () => {
    seedFeedBackend({
      users: [VOLPE],
      accepted: ['u-volpe'],
      summaries: {
        'u-volpe': {
          follow_state: 'accepted',
          followers_count: 1,
          following_count: 1,
          posts_count: 0,
        },
      },
    });
    await renderApp('ready', '/u/volpe.viola');
    expect(await screen.findByText('friends:publicProfile.empty')).toBeOnTheScreen();
  });

  it('Segnala o blocca apre il foglio di moderazione', async () => {
    seedFeedBackend({ users: [VOLPE], summaries: { 'u-volpe': {} } });
    await renderApp('ready', '/u/volpe.viola');
    await fireEvent.press(
      await screen.findByRole('button', { name: 'friends:publicProfile.more' }),
    );
    expect(await screen.findByText('friends:person.block')).toBeOnTheScreen();
    expect(screen.getByText('friends:person.report')).toBeOnTheScreen();
  });
});
