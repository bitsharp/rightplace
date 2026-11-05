import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useSeenStories } from '@/features/posts/store/seenStories';
import { renderApp } from '@/test/appFlows';
import { seedFeedBackend, type FakePost } from '@/test/feedBackend';
import { fakeSupabase } from '@/test/fakeSupabase';
import type { FakeUser } from '@/test/friendsBackend';

const VOLPE: FakeUser = { id: 'u-volpe', handle: 'volpe.viola' };
const post = (overrides: Partial<FakePost> = {}): FakePost => ({
  post_id: 'p1',
  author_id: 'u-volpe',
  author_handle: 'volpe.viola',
  caption: 'Che serata!',
  like_count: 2,
  comment_count: 1,
  ...overrides,
});

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

describe('feed', () => {
  it('mostra il banner e il post con autore, serata e scadenza', async () => {
    seedFeedBackend({ posts: [post()], users: [VOLPE], accepted: ['u-volpe'] });
    await renderApp('ready', '/feed');
    expect(await screen.findByText('feed:banner')).toBeOnTheScreen();
    expect(await screen.findByText('@volpe.viola')).toBeOnTheScreen();
    expect(screen.getByText('Che serata!')).toBeOnTheScreen();
    expect(screen.getByText(/feed:meta\.(lastNight|daysAgo|tonight)/)).toBeOnTheScreen();
    expect(screen.getByText('ui:post.expires({"count":7})')).toBeOnTheScreen();
  });

  it('il like è ottimistico: cuore pieno e contatore subito, poi la RPC', async () => {
    seedFeedBackend({ posts: [post()] });
    await renderApp('ready', '/feed');
    const like = await screen.findByRole('button', { name: 'ui:post.like' });
    expect(like).not.toBeSelected();
    await fireEvent.press(like);
    await waitFor(() => expect(rpcCalls('set_post_like')).toHaveLength(1));
    expect(rpcCalls('set_post_like')[0]?.[1]).toEqual({ p_post_id: 'p1', p_liked: true });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'ui:post.like' })).toBeSelected(),
    );
    expect(screen.getByText('3')).toBeOnTheScreen();
  });

  it('i commenti si aprono dal contatore: si legge e si scrive', async () => {
    seedFeedBackend({
      posts: [post()],
      comments: [
        {
          comment_id: 'c1',
          user_id: 'u-gatto',
          handle: 'gatto.blu',
          text: 'bellissima',
          created_at: '2026-11-09T10:00:00Z',
        },
      ],
    });
    await renderApp('ready', '/feed');
    await fireEvent.press(await screen.findByRole('button', { name: 'ui:post.comments' }));
    expect(await screen.findByText('bellissima')).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('feed:comments.placeholder'), 'grazie');
    await fireEvent.press(screen.getByRole('button', { name: 'feed:comments.send' }));
    await waitFor(() => expect(rpcCalls('add_post_comment')).toHaveLength(1));
    expect(await screen.findByText('grazie')).toBeOnTheScreen();
  });

  it('senza post: stato vuoto, e il link porta alla tab Amici', async () => {
    seedFeedBackend({ posts: [] });
    await renderApp('ready', '/feed');
    expect(await screen.findByText('feed:empty.title')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('feed:followMore'));
    expect(await screen.findByLabelText('friends:searchLabel')).toBeOnTheScreen();
  });

  it('il tocco lungo su un post altrui, Segnala: la segnalazione parte con tipo "post"', async () => {
    seedFeedBackend({ posts: [post()] });
    await renderApp('ready', '/feed');
    await fireEvent(await screen.findByTestId('post-card'), 'longPress');
    await fireEvent.press(await screen.findByText('feed:actions.reportPost'));
    await waitFor(() => expect(rpcCalls('report')).toHaveLength(1));
    expect(rpcCalls('report')[0]?.[1]).toMatchObject({ p_target_kind: 'post', p_target_id: 'p1' });
    expect(await screen.findByText('feed:actions.reported')).toBeOnTheScreen();
  });

  it('sul mio post il tocco lungo propone solo Elimina', async () => {
    seedFeedBackend({
      posts: [post({ is_mine: true, author_id: 'user-1', author_handle: 'lince.rosso' })],
    });
    await renderApp('ready', '/feed');
    await fireEvent(await screen.findByTestId('post-card'), 'longPress');
    expect(await screen.findByText('feed:actions.deletePost')).toBeOnTheScreen();
    expect(screen.queryByText('feed:actions.reportPost')).toBeNull();
  });
});

describe('storie', () => {
  const STORY = {
    user_id: 'u-volpe',
    handle: 'volpe.viola',
    latest_post_at: '2026-11-09T05:00:00Z',
  };

  it('tocco sulla storia: schermo intero coi post di oggi, e l’anello diventa "visto"', async () => {
    seedFeedBackend({
      stories: [STORY],
      storyPosts: { 'u-volpe': [post({ post_id: 's1', caption: 'storia di volpe' })] },
    });
    await renderApp('ready', '/feed');
    expect(await screen.findAllByTestId('story-ring-new')).toHaveLength(1);
    await fireEvent.press(
      await screen.findByRole('button', { name: 'ui:topBar.storyA11y({"handle":"@volpe.viola"})' }),
    );
    expect(await screen.findByText('storia di volpe')).toBeOnTheScreen();
    expect(useSeenStories.getState().seen).toEqual(['u-volpe:2026-11-09T05:00:00Z']);
    await fireEvent.press(screen.getByRole('button', { name: 'feed:story.close' }));
    await waitFor(() => expect(screen.queryByTestId('story-ring-new')).toBeNull());
    expect(screen.getAllByTestId('story-ring-seen').length).toBeGreaterThan(0);
  });

  it('"La tua storia" compare solo se ho post nelle ultime 24 ore', async () => {
    seedFeedBackend({
      storyPosts: { 'user-1': [post({ post_id: 'm1', is_mine: true, author_id: 'user-1' })] },
    });
    await renderApp('ready', '/feed');
    expect(await screen.findByText('ui:topBar.myStory')).toBeOnTheScreen();
  });
});

describe('"+" e pubblicazione', () => {
  it('il "+" non c’è senza una serata recente', async () => {
    seedFeedBackend({ target: null });
    await renderApp('ready', '/feed');
    await screen.findByText('feed:banner');
    expect(screen.queryByRole('button', { name: 'ui:topBar.post' })).toBeNull();
  });

  it('con una serata recente il "+" apre il post; pubblico un testo e torno indietro', async () => {
    const backend = seedFeedBackend({ target: {} });
    await renderApp('ready', '/feed');
    await fireEvent.press(await screen.findByRole('button', { name: 'ui:topBar.post' }));
    expect(await screen.findByRole('header', { name: 'post:title' })).toBeOnTheScreen();
    const publish = screen.getByRole('button', { name: 'post:publish' });
    expect(publish).toBeDisabled();
    await fireEvent.changeText(screen.getByLabelText('post:caption.label'), 'bella serata');
    await fireEvent.press(screen.getByRole('button', { name: 'post:publish' }));
    await waitFor(() => expect(backend.created).toHaveLength(1));
    expect(backend.created[0]).toEqual({
      caption: 'bella serata',
      photoPath: null,
      chatPhotoPath: null,
    });
    await waitFor(() => expect(screen.queryByRole('header', { name: 'post:title' })).toBeNull());
    expect(await screen.findByText('feed:banner')).toBeOnTheScreen();
    expect(rpcCalls('get_feed').length).toBeGreaterThan(1);
  });

  it('senza serata recente la schermata invita a dichiarare', async () => {
    seedFeedBackend({ target: null });
    await renderApp('ready', '/post/new');
    expect(await screen.findByText('post:noTarget.title')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'post:publish' })).toBeNull();
  });
});
