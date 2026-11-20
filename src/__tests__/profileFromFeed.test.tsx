import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Platform } from 'react-native';

import { renderApp } from '@/test/appFlows';
import { seedFeedBackend, type FakeComment, type FakePost } from '@/test/feedBackend';
import { fakeSupabase } from '@/test/fakeSupabase';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
}));

const VOLPE = { id: 'u-volpe', handle: 'volpe.viola', age_band: '25-34', gender: 'female' };
const OPEN_VOLPE = 'ui:profileLink.open({"handle":"@volpe.viola"})';
const OPEN_ME = 'ui:profileLink.open({"handle":"@lince.rosso"})';

const theirs = (id: string, overrides: Partial<FakePost> = {}): FakePost => ({
  post_id: id,
  author_id: VOLPE.id,
  author_handle: VOLPE.handle,
  has_photo: true,
  caption: `didascalia ${id}`,
  ...overrides,
});

const signUrls = () =>
  fakeSupabase.functions.invoke.mockImplementation(async (name: string, options?: unknown) => {
    const body = (options as { body: { postIds?: string[] } }).body;
    if (name === 'avatar-urls') return { data: { urls: [] }, error: null };
    const ids = body.postIds ?? [];
    return {
      data: { urls: ids.map((postId) => ({ postId, url: `https://signed.test/${postId}` })) },
      error: null,
    };
  });

const volpeProfile = {
  users: [VOLPE],
  accepted: [VOLPE.id],
  summaries: {
    [VOLPE.id]: {
      follow_state: 'accepted' as const,
      followers_count: 4,
      following_count: 5,
      posts_count: 2,
    },
  },
  userPosts: { [VOLPE.id]: [theirs('g1'), theirs('g2')] },
};

describe('dal feed al profilo dell’autore', () => {
  beforeEach(signUrls);
  afterEach(() => jest.restoreAllMocks());

  it('tocco sull’@handle di un post: profilo pubblico con la griglia dei suoi post', async () => {
    seedFeedBackend({ posts: [theirs('p1')], ...volpeProfile });
    await renderApp('ready', '/feed');
    const links = await screen.findAllByRole('link', { name: OPEN_VOLPE });
    await fireEvent.press(links[1] as never);
    await waitFor(() => expect(screen).toHavePathname('/u/volpe.viola'));
    expect(await screen.findAllByLabelText('didascalia g1')).not.toHaveLength(0);
    expect(screen.getByLabelText('didascalia g2')).toBeOnTheScreen();
  });

  it('tocco sull’avatar: stesso profilo', async () => {
    seedFeedBackend({ posts: [theirs('p1')], ...volpeProfile });
    await renderApp('ready', '/feed');
    const links = await screen.findAllByRole('link', { name: OPEN_VOLPE });
    await fireEvent.press(links[0] as never);
    await waitFor(() => expect(screen).toHavePathname('/u/volpe.viola'));
  });

  it('tocco su una miniatura del profilo pubblico: visore tra le foto di quel profilo', async () => {
    seedFeedBackend({ posts: [theirs('p1')], ...volpeProfile });
    await renderApp('ready', '/u/volpe.viola');
    const tiles = await screen.findAllByRole('button', {
      name: 'feed:grid.open({"handle":"@volpe.viola"})',
    });
    await fireEvent.press(tiles[1] as never);
    expect(
      await screen.findByText('ui:photoViewer.counter({"current":2,"total":2})'),
    ).toBeOnTheScreen();
  });

  it('il mio post porta alla tab Profilo', async () => {
    seedFeedBackend({
      posts: [theirs('p1', { author_id: 'user-1', author_handle: 'lince.rosso', is_mine: true })],
    });
    await renderApp('ready', '/feed');
    await fireEvent.press((await screen.findAllByRole('link', { name: OPEN_ME }))[1] as never);
    await waitFor(() => expect(screen).toHavePathname('/profile'));
  });

  it('il tocco sulla foto del post resta il visore', async () => {
    seedFeedBackend({ posts: [theirs('p1')], ...volpeProfile });
    await renderApp('ready', '/feed');
    await fireEvent.press(await screen.findByLabelText('ui:photoViewer.open'));
    expect(
      await screen.findByText('ui:photoViewer.counter({"current":1,"total":1})'),
    ).toBeOnTheScreen();
    expect(screen).toHavePathname('/feed');
  });

  it('commenti: il tocco su un autore chiude il foglio e apre il suo profilo', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    const comment: FakeComment = {
      comment_id: 'c1',
      user_id: VOLPE.id,
      handle: VOLPE.handle,
      text: 'bella serata',
      created_at: '2026-11-09T10:00:00Z',
    };
    seedFeedBackend({
      posts: [theirs('p1', { author_id: 'u-altro', author_handle: 'orso.verde' })],
      comments: [comment],
      ...volpeProfile,
    });
    await renderApp('ready', '/feed');
    await fireEvent.press(await screen.findByRole('button', { name: 'ui:post.comments' }));
    await fireEvent.press((await screen.findAllByRole('link', { name: OPEN_VOLPE }))[1] as never);
    await waitFor(() => expect(screen).toHavePathname('/u/volpe.viola'));
  });

  it('storia: il tocco sull’intestazione apre il profilo di chi l’ha pubblicata', async () => {
    seedFeedBackend({
      stories: [
        { user_id: VOLPE.id, handle: VOLPE.handle, latest_post_at: '2026-11-09T05:00:00Z' },
      ],
      storyPosts: { [VOLPE.id]: [theirs('s1', { has_photo: false })] },
      ...volpeProfile,
    });
    await renderApp('ready', '/feed');
    await fireEvent.press(
      await screen.findByRole('button', { name: 'ui:topBar.storyA11y({"handle":"@volpe.viola"})' }),
    );
    await screen.findByText('didascalia s1');
    await fireEvent.press((await screen.findAllByRole('link', { name: OPEN_VOLPE }))[0] as never);
    await waitFor(() => expect(screen).toHavePathname('/u/volpe.viola'));
  });
});
