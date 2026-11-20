import { screen, waitFor } from '@testing-library/react-native';

import { renderApp } from '@/test/appFlows';
import { seedFeedBackend, type FakePost } from '@/test/feedBackend';
import { fakeSupabase } from '@/test/fakeSupabase';
import type { FakeUser } from '@/test/friendsBackend';

const ME = 'user-1';
const VOLPE: FakeUser = { id: 'u-volpe', handle: 'volpe.viola' };
const ORSO: FakeUser = { id: 'u-orso', handle: 'orso.verde' };

const post = (id: string, author: FakeUser, overrides: Partial<FakePost> = {}): FakePost => ({
  post_id: id,
  author_id: author.id,
  author_handle: author.handle,
  caption: `didascalia ${id}`,
  ...overrides,
});

// Like the Edge Function: only the ids in `visible` come back signed.
const signAvatars = (visible: string[]) =>
  fakeSupabase.functions.invoke.mockImplementation(async (name: string, options?: unknown) => {
    const body = (options as { body: { userIds?: string[] } }).body;
    if (name !== 'avatar-urls') return { data: { urls: [] }, error: null };
    const ids = (body.userIds ?? []).filter((id) => visible.includes(id));
    return {
      data: { urls: ids.map((userId) => ({ userId, url: `https://signed.test/a/${userId}` })) },
      error: null,
    };
  });

const avatarCalls = () =>
  fakeSupabase.functions.invoke.mock.calls.filter(([name]) => name === 'avatar-urls');

describe('foto profilo nel feed', () => {
  it('una sola richiesta per la pagina; foto per chi è visibile, iniziale per gli altri', async () => {
    signAvatars([VOLPE.id]);
    seedFeedBackend({
      posts: [post('p1', VOLPE), post('p2', ORSO), post('p3', VOLPE)],
      users: [VOLPE, ORSO],
      accepted: [VOLPE.id],
    });
    await renderApp('ready', '/feed');
    await screen.findAllByTestId('post-card');
    await waitFor(() =>
      expect(screen.getAllByTestId('avatar-image', { includeHiddenElements: true })).toHaveLength(
        2,
      ),
    );
    const feedCalls = avatarCalls().filter(([, options]) =>
      (options as { body: { userIds: string[] } }).body.userIds.includes(ORSO.id),
    );
    expect(feedCalls).toHaveLength(1);
    expect(feedCalls[0]?.[1]).toEqual({ body: { userIds: [ORSO.id, VOLPE.id] } });
  });

  it('il mio post mostra la mia foto', async () => {
    signAvatars([ME]);
    seedFeedBackend({
      posts: [post('p1', { id: ME, handle: 'lince.rosso' }, { is_mine: true })],
    });
    await renderApp('ready', '/feed');
    expect(
      await screen.findByTestId('avatar-image', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it('senza foto visibili resta l’iniziale', async () => {
    signAvatars([]);
    seedFeedBackend({ posts: [post('p1', ORSO)], users: [ORSO] });
    await renderApp('ready', '/feed');
    await screen.findAllByTestId('post-card');
    expect(screen.queryByTestId('avatar-image', { includeHiddenElements: true })).toBeNull();
  });
});
