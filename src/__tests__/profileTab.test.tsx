import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderApp } from '@/test/appFlows';
import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { seedFeedBackend, type FakePost } from '@/test/feedBackend';
import { seedFriendsBackend } from '@/test/friendsBackend';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
}));

const ME = 'user-1';
const mine = (id: string, overrides: Partial<FakePost> = {}): FakePost => ({
  post_id: id,
  author_id: ME,
  author_handle: 'lince.rosso',
  is_mine: true,
  has_photo: true,
  caption: `didascalia ${id}`,
  ...overrides,
});

// Signs avatars and post photos like the Edge Functions do (here: every id gets a URL).
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

const SUMMARY = {
  handle: 'lince.rosso',
  gender: 'female',
  is_me: true,
  followers_count: 12,
  following_count: 30,
  posts_count: 3,
};

const seed = (posts: FakePost[] = [], extra: Parameters<typeof seedFeedBackend>[0] = {}) =>
  seedFeedBackend({
    users: [{ id: 'u-gatto', handle: 'gatto.blu' }],
    summaries: { [ME]: SUMMARY },
    userPosts: { [ME]: posts },
    ...extra,
  });

describe('tab Profilo in stile Instagram', () => {
  beforeEach(() => signUrls());

  it('mostra la barra in alto, l’handle, fascia d’età · genere e i tre contatori', async () => {
    seed();
    await renderApp('ready', '/profile');
    expect(await screen.findByText('12')).toBeOnTheScreen();
    expect(screen.getByText('30')).toBeOnTheScreen();
    expect(screen.getByText('3')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'ui:topBar.feedback' })).toBeOnTheScreen();
    expect(
      screen.getByText('friends:meta({"age":"25–34","gender":"friends:gender.female"})'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'profile:avatar.change' })).toBeOnTheScreen();
  });

  it('i contatori leggono il server: get_profile_summary del mio id', async () => {
    seed();
    await renderApp('ready', '/profile');
    await screen.findByText('12');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_profile_summary', { p_user_id: ME });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith(
      'get_user_posts',
      expect.objectContaining({ p_user_id: ME }),
    );
  });

  it('Modifica profilo apre l’elenco delle impostazioni', async () => {
    seed();
    await renderApp('ready', '/profile');
    await fireEvent.press(await screen.findByRole('button', { name: 'profile:header.edit' }));
    expect(await screen.findByText('profile:settings.groups.account')).toBeOnTheScreen();
    expect(screen.getByText('profile:settings.groups.info')).toBeOnTheScreen();
  });

  it('l’intestazione mostra la città della mappa con il pin, e nessun nome reale', async () => {
    seed();
    setFakeRpc({
      get_active_cities: [
        { slug: 'milano', name: 'Milano', country: 'IT', lat: 45.46, lng: 9.19, default_zoom: 13 },
      ],
      get_profile_summary: [SUMMARY],
      get_user_posts: [],
    });
    await renderApp('ready', '/profile');
    expect(await screen.findByText('Milano')).toBeOnTheScreen();
    expect(
      screen.getAllByTestId('icon-map', { includeHiddenElements: true }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText('@lince.rosso').length).toBeGreaterThan(0);
    expect(screen.getByTestId('profile-header-top')).toHaveStyle({ flexDirection: 'column' });
  });

  it('toccando i follower apre l’elenco, dove Rimuovi funziona ancora', async () => {
    seedFriendsBackend(
      { users: [{ id: 'u-gatto', handle: 'gatto.blu' }], followers: ['u-gatto'] },
      {
        get_profile_summary: [
          {
            ...SUMMARY,
            age_band: '25-34',
            is_creator: false,
            posts_count: 0,
            follow_state: 'none',
          },
        ],
        get_user_posts: [],
      },
    );
    await renderApp('ready', '/profile');
    await fireEvent.press(
      await screen.findByRole('button', { name: 'profile:header.a11yFollowers({"count":12})' }),
    );
    expect(await screen.findByText('profile:followers.title')).toBeOnTheScreen();
    expect(await screen.findByText('@gatto.blu')).toBeOnTheScreen();
  });

  it('toccando i seguiti apre l’elenco di chi seguo', async () => {
    seed([], { accepted: ['u-gatto'] });
    await renderApp('ready', '/profile');
    await fireEvent.press(
      await screen.findByRole('button', { name: 'profile:header.a11yFollowing({"count":30})' }),
    );
    expect(await screen.findByText('friends:following.title')).toBeOnTheScreen();
    expect(await screen.findByText('@gatto.blu')).toBeOnTheScreen();
  });

  it('la griglia mostra i miei post: foto come miniature, solo testo come tessere', async () => {
    seed([mine('p1'), mine('p2', { has_photo: false, caption: 'solo parole' })]);
    await renderApp('ready', '/profile');
    expect(await screen.findByLabelText('didascalia p1')).toBeOnTheScreen();
    expect(screen.getByText('solo parole')).toBeOnTheScreen();
  });

  it('senza post spiega che compaiono qui per 7 giorni', async () => {
    seed([]);
    await renderApp('ready', '/profile');
    expect(await screen.findByText('profile:posts.emptyMine')).toBeOnTheScreen();
  });

  it('tocco su una miniatura: il viewer si apre sulla foto, tra le mie foto', async () => {
    seed([mine('p1'), mine('p2'), mine('p3', { has_photo: false })]);
    await renderApp('ready', '/profile');
    const tiles = await screen.findAllByRole('button', {
      name: 'feed:grid.open({"handle":"@lince.rosso"})',
    });
    await fireEvent.press(tiles[1] as never);
    expect(
      await screen.findByText('ui:photoViewer.counter({"current":2,"total":2})'),
    ).toBeOnTheScreen();
  });

  it('tocco su un post solo testo: ne apre la didascalia intera', async () => {
    seed([mine('p2', { has_photo: false, caption: 'solo parole' })]);
    await renderApp('ready', '/profile');
    await fireEvent.press(
      await screen.findByRole('button', { name: 'feed:grid.open({"handle":"@lince.rosso"})' }),
    );
    expect(await screen.findByTestId('post-caption')).toBeOnTheScreen();
  });

  it('tocco lungo su un mio post: offre di eliminarlo, e sparisce dalla griglia', async () => {
    seed([mine('p1', { caption: 'da togliere' })]);
    await renderApp('ready', '/profile');
    const tile = await screen.findByRole('button', {
      name: 'feed:grid.open({"handle":"@lince.rosso"})',
    });
    await fireEvent(tile, 'longPress');
    await fireEvent.press(await screen.findByText('feed:actions.deletePost'));
    await fireEvent.press(await screen.findByText('feed:actions.deleteConfirm'));
    await waitFor(() =>
      expect(fakeSupabase.rpc).toHaveBeenCalledWith('delete_post', { p_post_id: 'p1' }),
    );
  });

  it('con la foto profilo visibile mostra la foto al posto dell’iniziale', async () => {
    signUrls([ME]);
    seed();
    await renderApp('ready', '/profile');
    // the header of the profile and, next to my @handle, the top bar
    expect(
      await screen.findAllByTestId('avatar-image', { includeHiddenElements: true }),
    ).toHaveLength(2);
  });

  describe('Condividi', () => {
    const originalFlag = process.env.EXPO_PUBLIC_SHARE_ENABLED;
    afterEach(() => {
      if (originalFlag === undefined) delete process.env.EXPO_PUBLIC_SHARE_ENABLED;
      else process.env.EXPO_PUBLIC_SHARE_ENABLED = originalFlag;
    });

    it('senza il flag non c’è', async () => {
      delete process.env.EXPO_PUBLIC_SHARE_ENABLED;
      seed();
      await renderApp('ready', '/profile');
      await screen.findByText('12');
      expect(screen.queryByRole('button', { name: 'profile:share.cta' })).toBeNull();
    });

    it('con il flag acceso compare accanto a Modifica profilo', async () => {
      process.env.EXPO_PUBLIC_SHARE_ENABLED = 'true';
      seed();
      await renderApp('ready', '/profile');
      expect(await screen.findByRole('button', { name: 'profile:share.cta' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'profile:header.edit' })).toBeOnTheScreen();
    });
  });
});

describe('tab Chat con la barra in alto', () => {
  it('la barra (con il feedback) c’è anche nella tab Chat', async () => {
    seed();
    await renderApp('ready', '/chat');
    expect(await screen.findByRole('button', { name: 'ui:topBar.feedback' })).toBeOnTheScreen();
    expect(screen.getByText('chat:title')).toBeOnTheScreen();
  });
});
