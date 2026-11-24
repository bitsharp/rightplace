import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderApp } from '@/test/appFlows';
import { seedFeedBackend, type FakePost } from '@/test/feedBackend';
import { fakeSupabase } from '@/test/fakeSupabase';

const MINE: FakePost = {
  post_id: 'p1',
  author_id: 'user-1',
  author_handle: 'lince.rosso',
  caption: 'ieri sera',
  is_mine: true,
  like_count: 1,
  comment_count: 2,
};
const LIKERS = {
  p1: [{ user_id: 'u-volpe', handle: 'volpe.viola', liked_at: '2026-11-09T10:00:00Z' }],
};
const COMMENTS = [
  {
    comment_id: 'c2',
    user_id: 'u-gatto',
    handle: 'gatto.blu',
    text: 'secondo',
    created_at: '2026-11-09T10:02:00Z',
  },
  {
    comment_id: 'c1',
    user_id: 'u-volpe',
    handle: 'volpe.viola',
    text: 'primo',
    created_at: '2026-11-09T10:01:00Z',
  },
];
const activity = (kind: 'like' | 'comment', extra: Record<string, unknown> = {}) => [
  {
    kind,
    actor_handle: 'volpe.viola',
    actor_id: 'u-volpe',
    post_id: 'p1',
    created_at: '2026-11-13T12:00:00Z',
    ...extra,
  },
];
const rpcCalls = (name: string) => fakeSupabase.rpc.mock.calls.filter(([n]) => n === name);

describe('dalle Novità al post', () => {
  it('un like in Novità apre il post con “Piace a” e chi ha messo like', async () => {
    seedFeedBackend({ posts: [MINE], likers: LIKERS, activity: activity('like') });
    await renderApp('ready', '/activity');
    await fireEvent.press(
      await screen.findByText('notifications:activity.items.like({"handle":"@volpe.viola"})'),
    );
    expect(await screen.findByText('ieri sera')).toBeOnTheScreen();
    expect(await screen.findByText('feed:post.likedBy')).toBeOnTheScreen();
    expect(await screen.findByText('@volpe.viola')).toBeOnTheScreen();
  });

  it('un commento in Novità apre il post con il foglio dei commenti sul commento indicato', async () => {
    seedFeedBackend({
      posts: [MINE],
      likers: LIKERS,
      comments: COMMENTS,
      activity: activity('comment', { comment_id: 'c1' }),
    });
    await renderApp('ready', '/activity');
    await fireEvent.press(
      await screen.findByText('notifications:activity.items.comment({"handle":"@volpe.viola"})'),
    );
    expect(await screen.findByText('primo')).toBeOnTheScreen();
    expect(screen.getByText('secondo')).toBeOnTheScreen();
    expect(screen.getAllByTestId('comment-highlighted')).toHaveLength(1);
  });

  it('il link /post/<id> apre il post e /post/new continua ad aprire la nuova pubblicazione', async () => {
    seedFeedBackend({ posts: [MINE], likers: LIKERS, target: { room_id: null } });
    await renderApp('ready', '/post/p1');
    expect(await screen.findByText('ieri sera')).toBeOnTheScreen();
    expect(rpcCalls('get_post')).toHaveLength(1);
    expect(rpcCalls('get_post')[0]?.[1]).toEqual({ p_post_id: 'p1' });
  });

  it('/post/new non viene letto come l’id di un post', async () => {
    seedFeedBackend({ posts: [MINE], target: { room_id: null } });
    await renderApp('ready', '/post/new');
    await waitFor(() => expect(rpcCalls('get_post_target').length).toBeGreaterThan(0));
    expect(rpcCalls('get_post')).toHaveLength(0);
  });

  it('un post che non è più visibile mostra “non più disponibile”', async () => {
    seedFeedBackend({ posts: [] });
    await renderApp('ready', '/post/p-scaduto');
    expect(await screen.findByText('feed:post.unavailable')).toBeOnTheScreen();
  });
});
