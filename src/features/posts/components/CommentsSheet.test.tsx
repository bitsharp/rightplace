import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { CommentsSheet } from './CommentsSheet';

const comment = (id: string, text: string, overrides: Record<string, unknown> = {}) => ({
  comment_id: id,
  user_id: 'u2',
  handle: 'gatto.blu',
  text,
  created_at: `2026-11-09T10:0${id}:00Z`,
  is_mine: false,
  can_delete: false,
  ...overrides,
});

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

function open(onClose = jest.fn()) {
  const { Wrapper } = createQueryWrapper();
  return render(<CommentsSheet postId="p1" onClose={onClose} />, { wrapper: Wrapper });
}

describe('CommentsSheet', () => {
  it('elenca i commenti dal più vecchio al più nuovo', async () => {
    setFakeRpc({ get_post_comments: [comment('2', 'secondo'), comment('1', 'primo')] });
    await open();
    expect(await screen.findByText('primo')).toBeOnTheScreen();
    const texts = screen.getAllByTestId('comment-text').map((node) => node.props.children);
    expect(texts).toEqual(['primo', 'secondo']);
  });

  it('senza commenti invita a scrivere il primo', async () => {
    setFakeRpc({ get_post_comments: [] });
    await open();
    expect(await screen.findByText('feed:comments.empty')).toBeOnTheScreen();
  });

  it('il campo accetta al massimo 300 caratteri e mostra il contatore', async () => {
    setFakeRpc({ get_post_comments: [] });
    await open();
    const input = await screen.findByLabelText('feed:comments.placeholder');
    expect(input.props.maxLength).toBe(300);
    await fireEvent.changeText(input, 'ciao');
    expect(screen.getByText('feed:comments.counter({"count":4,"max":300})')).toBeOnTheScreen();
  });

  it('Invia è disabilitato finché il testo è vuoto o di soli spazi', async () => {
    setFakeRpc({ get_post_comments: [] });
    await open();
    const input = await screen.findByLabelText('feed:comments.placeholder');
    expect(screen.getByRole('button', { name: 'feed:comments.send' })).toBeDisabled();
    await fireEvent.changeText(input, '   ');
    expect(screen.getByRole('button', { name: 'feed:comments.send' })).toBeDisabled();
  });

  it('invia il commento senza spazi attorno e svuota il campo', async () => {
    setFakeRpc({
      get_post_comments: [],
      add_post_comment: [{ comment_id: 'c9', created_at: '2026-11-09T12:00:00Z' }],
    });
    await open();
    await fireEvent.changeText(
      await screen.findByLabelText('feed:comments.placeholder'),
      '  bella  ',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'feed:comments.send' }));
    await waitFor(() => expect(rpcCalls('add_post_comment')).toHaveLength(1));
    expect(rpcCalls('add_post_comment')[0]?.[1]).toEqual({ p_post_id: 'p1', p_text: 'bella' });
    await waitFor(() =>
      expect(screen.getByLabelText('feed:comments.placeholder').props.value).toBe(''),
    );
  });

  it('un errore del server compare in chiaro e il testo resta', async () => {
    setFakeRpc({ get_post_comments: [] });
    const base = fakeSupabase.rpc.getMockImplementation();
    fakeSupabase.rpc.mockImplementation(async (name: string, args?: unknown) =>
      name === 'add_post_comment'
        ? { data: null, error: { message: 'POST_NOT_FOUND' } }
        : (base?.(name, args) ?? { data: null, error: null }),
    );
    await open();
    await fireEvent.changeText(await screen.findByLabelText('feed:comments.placeholder'), 'ciao');
    await fireEvent.press(screen.getByRole('button', { name: 'feed:comments.send' }));
    expect(await screen.findByText('errors:rpc.POST_NOT_FOUND')).toBeOnTheScreen();
    expect(screen.getByLabelText('feed:comments.placeholder').props.value).toBe('ciao');
  });

  it('tocco lungo su un commento altrui: si può solo segnalare, e la segnalazione parte', async () => {
    setFakeRpc({ get_post_comments: [comment('1', 'primo')], report: null });
    await open();
    await fireEvent(await screen.findByText('primo'), 'longPress');
    expect(screen.queryByText('feed:actions.deleteComment')).toBeNull();
    await fireEvent.press(screen.getByText('feed:actions.reportComment'));
    await waitFor(() => expect(rpcCalls('report')).toHaveLength(1));
    expect(rpcCalls('report')[0]?.[1]).toEqual({
      p_target_kind: 'comment',
      p_target_id: '1',
      p_reason: null,
    });
    expect(await screen.findByText('feed:actions.reported')).toBeOnTheScreen();
  });

  it('sul mio commento (o sul mio post) si può eliminare, senza segnalarlo', async () => {
    setFakeRpc({
      get_post_comments: [comment('1', 'mio', { is_mine: true, can_delete: true })],
      delete_post_comment: null,
    });
    await open();
    await fireEvent(await screen.findByText('mio'), 'longPress');
    expect(screen.queryByText('feed:actions.reportComment')).toBeNull();
    await fireEvent.press(screen.getByText('feed:actions.deleteComment'));
    await waitFor(() => expect(rpcCalls('delete_post_comment')).toHaveLength(1));
    expect(rpcCalls('delete_post_comment')[0]?.[1]).toEqual({ p_comment_id: '1' });
  });

  it('con postId nullo il foglio è chiuso', async () => {
    const { Wrapper } = createQueryWrapper();
    await render(<CommentsSheet postId={null} onClose={jest.fn()} />, { wrapper: Wrapper });
    expect(screen.queryByLabelText('feed:comments.placeholder')).toBeNull();
  });
});
