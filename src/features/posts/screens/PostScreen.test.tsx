import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { PostScreen } from './PostScreen';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), canGoBack: () => true, replace: jest.fn() }),
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
}));

const postRow = (overrides: Record<string, unknown> = {}) => ({
  post_id: 'p1',
  author_id: 'u-me',
  author_handle: 'lince.rosso',
  venue_name: 'Arena Club',
  night_date: '2026-11-08',
  caption: 'che serata',
  has_photo: false,
  visible_from: '2026-11-09T05:00:00Z',
  expires_at: new Date(Date.now() + 5 * 86_400_000).toISOString(),
  like_count: 2,
  comment_count: 1,
  liked_by_me: false,
  is_mine: true,
  ...overrides,
});

const LIKERS = [
  { user_id: 'u-volpe', handle: 'volpe.viola', liked_at: '2026-11-09T10:00:00Z' },
  { user_id: 'u-gatto', handle: 'gatto.blu', liked_at: '2026-11-09T11:00:00Z' },
];

const comment = (id: string, text: string) => ({
  comment_id: id,
  user_id: 'u-volpe',
  handle: 'volpe.viola',
  text,
  created_at: `2026-11-09T10:0${id}:00Z`,
  is_mine: false,
  can_delete: false,
});

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

const renderPost = (props: Partial<Parameters<typeof PostScreen>[0]> = {}) =>
  render(<PostScreen postId="p1" {...props} />, { wrapper: createQueryWrapper().Wrapper });

beforeEach(() => mockPush.mockClear());

describe('PostScreen', () => {
  it('mostra il post con didascalia, like e commenti', async () => {
    setFakeRpc({ get_post: [postRow()], get_post_likers: LIKERS });
    await renderPost();
    expect(await screen.findByText('che serata')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'ui:post.like' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'ui:post.comments' })).toBeOnTheScreen();
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_post', { p_post_id: 'p1' });
  });

  it('l’autore vede “Piace a” con chi ha messo like, e il tocco apre il profilo', async () => {
    setFakeRpc({ get_post: [postRow()], get_post_likers: LIKERS });
    await renderPost();
    expect(await screen.findByText('feed:post.likedBy')).toBeOnTheScreen();
    expect(await screen.findByText('@volpe.viola')).toBeOnTheScreen();
    expect(screen.getByText('@gatto.blu')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('@gatto.blu'));
    expect(mockPush).toHaveBeenCalledWith('/u/gatto.blu');
  });

  it('le foto profilo di chi ha messo like arrivano in una sola richiesta, chi non ha foto ha l’iniziale', async () => {
    setFakeRpc({ get_post: [postRow()], get_post_likers: LIKERS });
    fakeSupabase.functions.invoke.mockResolvedValue({
      data: { urls: [{ userId: 'u-volpe', url: 'https://signed.test/volpe' }] },
      error: null,
    });
    await renderPost();
    await screen.findByText('@gatto.blu');
    await waitFor(() =>
      expect(screen.getAllByTestId('avatar-image', { includeHiddenElements: true })).toHaveLength(
        1,
      ),
    );
    expect(screen.getByText('G', { includeHiddenElements: true })).toBeOnTheScreen();
  });

  it('senza like l’autore vede che nessuno ha ancora messo like', async () => {
    setFakeRpc({ get_post: [postRow({ like_count: 0 })], get_post_likers: [] });
    await renderPost();
    expect(await screen.findByText('feed:post.noLikes')).toBeOnTheScreen();
  });

  it('chi non è l’autore non vede la sezione e non chiede mai chi ha messo like', async () => {
    setFakeRpc({ get_post: [postRow({ is_mine: false, author_id: 'u-volpe' })] });
    await renderPost();
    expect(await screen.findByText('che serata')).toBeOnTheScreen();
    expect(screen.queryByText('feed:post.likedBy')).toBeNull();
    expect(rpcCalls('get_post_likers')).toHaveLength(0);
  });

  it('un post scaduto o non visibile mostra “non più disponibile”, senza chiedere i like', async () => {
    setFakeRpc({ get_post: [] });
    await renderPost();
    expect(await screen.findByText('feed:post.unavailable')).toBeOnTheScreen();
    expect(rpcCalls('get_post_likers')).toHaveLength(0);
  });

  it('un errore di rete non finge che il post sia sparito', async () => {
    fakeSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'boom' } });
    await renderPost();
    expect(await screen.findByText('feed:post.loadError')).toBeOnTheScreen();
    expect(screen.queryByText('feed:post.unavailable')).toBeNull();
  });

  it('con openComments il foglio dei commenti è già aperto, con il commento indicato in evidenza', async () => {
    setFakeRpc({
      get_post: [postRow()],
      get_post_likers: LIKERS,
      get_post_comments: [comment('2', 'secondo'), comment('1', 'primo')],
    });
    await renderPost({ openComments: true, highlightCommentId: '1' });
    expect(await screen.findByText('primo')).toBeOnTheScreen();
    expect(screen.getByText('secondo')).toBeOnTheScreen();
    expect(screen.getAllByTestId('comment-highlighted')).toHaveLength(1);
  });

  it('il like dalla pagina del post passa dal server e aggiorna il contatore', async () => {
    setFakeRpc({
      get_post: [postRow({ is_mine: false, author_id: 'u-volpe' })],
      set_post_like: [{ like_count: 3, liked_by_me: true }],
    });
    await renderPost();
    await fireEvent.press(await screen.findByRole('button', { name: 'ui:post.like' }));
    await waitFor(() =>
      expect(fakeSupabase.rpc).toHaveBeenCalledWith('set_post_like', {
        p_post_id: 'p1',
        p_liked: true,
      }),
    );
    expect(await screen.findByText('3')).toBeOnTheScreen();
  });

  it('senza openComments il foglio resta chiuso e si apre dal pulsante commenti', async () => {
    setFakeRpc({ get_post: [postRow()], get_post_likers: LIKERS, get_post_comments: [] });
    await renderPost();
    await screen.findByText('che serata');
    expect(screen.queryByTestId('comments-list')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'ui:post.comments' }));
    expect(await screen.findByText('feed:comments.empty')).toBeOnTheScreen();
  });
});
