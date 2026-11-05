import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import type { FeedPost } from '../domain/types';
import { PostActionsSheet } from './PostActionsSheet';

const post = (overrides: Partial<FeedPost> = {}): FeedPost => ({
  id: 'p1',
  authorId: 'u2',
  authorHandle: 'volpe.viola',
  venueName: 'Arena Club',
  nightDate: '2026-11-08',
  caption: null,
  hasPhoto: false,
  visibleFrom: '2026-11-09T05:00:00Z',
  expiresAt: '2026-11-16T05:00:00Z',
  likeCount: 0,
  commentCount: 0,
  likedByMe: false,
  isMine: false,
  ...overrides,
});

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

function open(target: FeedPost, onDone = jest.fn(), onClose = jest.fn()) {
  setFakeRpc({ report: null, block_user: null, delete_post: null });
  const { Wrapper } = createQueryWrapper();
  return render(<PostActionsSheet post={target} onClose={onClose} onDone={onDone} />, {
    wrapper: Wrapper,
  });
}

describe('PostActionsSheet', () => {
  it('su un post altrui segnala senza chiedere conferma', async () => {
    const onDone = jest.fn();
    await open(post(), onDone);
    await fireEvent.press(screen.getByText('feed:actions.reportPost'));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('reported'));
    expect(rpcCalls('report')[0]?.[1]).toEqual({
      p_target_kind: 'post',
      p_target_id: 'p1',
      p_reason: null,
    });
  });

  it('bloccare l’autore chiede conferma prima di partire', async () => {
    const onDone = jest.fn();
    await open(post(), onDone);
    await fireEvent.press(screen.getByText('feed:actions.block'));
    expect(rpcCalls('block_user')).toHaveLength(0);
    await fireEvent.press(screen.getByText('feed:actions.blockConfirm'));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('blocked'));
    expect(rpcCalls('block_user')[0]?.[1]).toEqual({ p_user_id: 'u2' });
  });

  it('sul mio post c’è solo Elimina (con conferma), mai Segnala né Blocca', async () => {
    const onDone = jest.fn();
    await open(post({ isMine: true, authorId: 'user-1' }), onDone);
    expect(screen.queryByText('feed:actions.reportPost')).toBeNull();
    expect(screen.queryByText('feed:actions.block')).toBeNull();
    await fireEvent.press(screen.getByText('feed:actions.deletePost'));
    expect(rpcCalls('delete_post')).toHaveLength(0);
    await fireEvent.press(screen.getByText('feed:actions.deleteConfirm'));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('deleted'));
    expect(rpcCalls('delete_post')[0]?.[1]).toEqual({ p_post_id: 'p1' });
  });

  it('senza post il foglio è chiuso', async () => {
    const { Wrapper } = createQueryWrapper();
    await render(<PostActionsSheet post={null} onClose={jest.fn()} onDone={jest.fn()} />, {
      wrapper: Wrapper,
    });
    expect(screen.queryByText('feed:actions.cancel')).toBeNull();
  });
});
