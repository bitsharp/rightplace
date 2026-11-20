import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderApp } from '@/test/appFlows';
import { seedFeedBackend, type FakePost } from '@/test/feedBackend';
import { fakeSupabase } from '@/test/fakeSupabase';

const withPhoto = (id: string, overrides: Partial<FakePost> = {}): FakePost => ({
  post_id: id,
  author_id: 'u-volpe',
  author_handle: 'volpe.viola',
  caption: `didascalia ${id}`,
  has_photo: true,
  ...overrides,
});

const signUrls = () =>
  fakeSupabase.functions.invoke.mockImplementation(async (_name: string, options?: unknown) => {
    const { postIds } = (options as { body: { postIds: string[] } }).body;
    return {
      data: { urls: postIds.map((postId) => ({ postId, url: `https://signed.test/${postId}` })) },
      error: null,
    };
  });

describe('foto del feed ingrandibili', () => {
  beforeEach(signUrls);

  it('tocco sulla foto di un post: il viewer si apre su quella foto, tra le foto dei post caricati', async () => {
    seedFeedBackend({ posts: [withPhoto('p1'), withPhoto('p2'), withPhoto('p3')] });
    await renderApp('ready', '/feed');
    const photos = await screen.findAllByLabelText('ui:photoViewer.open');
    expect(photos).toHaveLength(3);
    await fireEvent.press(photos[1] as never);
    expect(
      await screen.findByText('ui:photoViewer.counter({"current":2,"total":3})'),
    ).toBeOnTheScreen();
    expect(screen.getByTestId('photo-viewer-list').props.initialScrollIndex).toBe(1);
  });

  it('i post di solo testo non hanno una foto da aprire e non entrano nel viewer', async () => {
    seedFeedBackend({
      posts: [withPhoto('p1'), withPhoto('p2', { has_photo: false }), withPhoto('p3')],
    });
    await renderApp('ready', '/feed');
    const photos = await screen.findAllByLabelText('ui:photoViewer.open');
    expect(photos).toHaveLength(2);
    await fireEvent.press(photos[1] as never);
    expect(
      await screen.findByText('ui:photoViewer.counter({"current":2,"total":2})'),
    ).toBeOnTheScreen();
  });

  it('il like funziona ancora e non apre il viewer', async () => {
    seedFeedBackend({ posts: [withPhoto('p1')] });
    await renderApp('ready', '/feed');
    await fireEvent.press(await screen.findByRole('button', { name: 'ui:post.like' }));
    await waitFor(() =>
      expect(fakeSupabase.rpc.mock.calls.some(([name]) => name === 'set_post_like')).toBe(true),
    );
    expect(screen.queryByText(/ui:photoViewer.counter/)).toBeNull();
  });

  it('nella vista storia il tocco sulla foto apre il viewer sulla stessa foto', async () => {
    seedFeedBackend({
      stories: [
        { user_id: 'u-volpe', handle: 'volpe.viola', latest_post_at: '2026-11-09T05:00:00Z' },
      ],
      storyPosts: { 'u-volpe': [withPhoto('s1'), withPhoto('s2')] },
    });
    await renderApp('ready', '/feed');
    await fireEvent.press(
      await screen.findByRole('button', { name: 'ui:topBar.storyA11y({"handle":"@volpe.viola"})' }),
    );
    const photos = await screen.findAllByLabelText('ui:photoViewer.open');
    await fireEvent.press(photos[1] as never);
    expect(
      await screen.findByText('ui:photoViewer.counter({"current":1,"total":1})'),
    ).toBeOnTheScreen();
  });
});
