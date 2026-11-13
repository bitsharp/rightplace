import { renderHook, waitFor } from '@testing-library/react-native';
import { act } from 'react';

import { useAuthStore } from '@/features/auth/store/authStore';
import {
  useCreatePost,
  useAddComment,
  useDeleteComment,
  useDeletePost,
  useToggleLike,
} from '@/features/posts/mutations';
import { useRegenerateHandle } from '@/features/profile/useRegenerateHandle';
import { useSaveProfile } from '@/features/profile/useSaveProfile';
import { useDeclare, useUndeclare } from '@/features/venue/hooks';
import { setFakeRpc } from '@/test/fakeSupabase';
import { spyOnInvalidations } from '@/test/invalidations';
import { createQueryWrapper } from '@/test/queryWrapper';

jest.mock('expo-router', () => ({ useIsFocused: jest.fn(() => true) }));

// Rule of the app: a mutation that succeeds reloads (or patches) every cached query showing that data.
const post = (overrides: Record<string, unknown> = {}) => ({
  id: 'p1',
  authorId: 'u1',
  authorHandle: 'volpe.viola',
  venueName: 'Arena Club',
  nightDate: '2026-11-13',
  caption: null,
  hasPhoto: false,
  visibleFrom: '2026-11-14T08:00:00.123456Z',
  expiresAt: '2026-11-21T08:00:00Z',
  likeCount: 1,
  commentCount: 2,
  likedByMe: false,
  isMine: false,
  ...overrides,
});

const PROFILE_INPUT = {
  birthDate: '2000-05-10',
  gender: 'female' as const,
  locale: 'it' as const,
  locationOptIn: false,
  contactsOptIn: true,
  isCreator: false,
};

describe('dichiarazione e annullamento', () => {
  const DECLARATION_DEPENDENTS = (venueStats: string[]) => [
    ['myDeclaration'],
    ['cityMap'],
    venueStats,
    ['stories'],
    ['postTarget'],
    ['cityEvents'],
    ['eventDetail'],
    ['chatRooms'],
  ];

  it('declare ricarica pillola, mappa, statistiche, storie, "+", eventi e chat', async () => {
    setFakeRpc({});
    const { Wrapper, client } = createQueryWrapper();
    const invalidated = spyOnInvalidations(client);
    const { result } = await renderHook(() => useDeclare(), { wrapper: Wrapper });
    await act(async () => {
      result.current.mutate({
        target: { kind: 'night', id: 'v1' },
        intent: 'going',
        venue: { id: 'v1', name: 'Arena Club' },
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidated()).toEqual(
      expect.arrayContaining(DECLARATION_DEPENDENTS(['venueStats', 'v1'])),
    );
  });

  it('undeclare ricarica gli stessi dati', async () => {
    setFakeRpc({});
    const { Wrapper, client } = createQueryWrapper();
    const invalidated = spyOnInvalidations(client);
    const { result } = await renderHook(() => useUndeclare(), { wrapper: Wrapper });
    await act(async () => {
      result.current.mutate();
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidated()).toEqual(expect.arrayContaining(DECLARATION_DEPENDENTS(['venueStats'])));
  });
});

describe('like, commenti e post', () => {
  it('il like aggiorna il post in feed e nelle storie con il conteggio del server', async () => {
    setFakeRpc({ set_post_like: [{ like_count: 2, liked_by_me: true }] });
    const { Wrapper, client } = createQueryWrapper();
    client.setQueryData(['feed'], { pages: [[post()]], pageParams: [undefined] });
    client.setQueryData(['storyPosts', 'u1'], [post()]);
    const { result } = await renderHook(() => useToggleLike(), { wrapper: Wrapper });
    await act(async () => {
      result.current.mutate({ postId: 'p1', liked: true });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const feed = client.getQueryData<{ pages: { likeCount: number }[][] }>(['feed']);
    const stories = client.getQueryData<{ likedByMe: boolean }[]>(['storyPosts', 'u1']);
    expect(feed?.pages[0]?.[0]?.likeCount).toBe(2);
    expect(stories?.[0]?.likedByMe).toBe(true);
  });

  it('aggiungere un commento aggiorna il contatore e ricarica la lista commenti', async () => {
    setFakeRpc({ add_post_comment: [{ comment_id: 'c1', created_at: '2026-11-14T09:00:00Z' }] });
    const { Wrapper, client } = createQueryWrapper();
    client.setQueryData(['feed'], { pages: [[post()]], pageParams: [undefined] });
    const invalidated = spyOnInvalidations(client);
    const { result } = await renderHook(() => useAddComment('p1'), { wrapper: Wrapper });
    await act(async () => {
      result.current.mutate('ciao');
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const feed = client.getQueryData<{ pages: { commentCount: number }[][] }>(['feed']);
    expect(feed?.pages[0]?.[0]?.commentCount).toBe(3);
    expect(invalidated()).toContainEqual(['postComments', 'p1']);
  });

  it('cancellare un commento scala il contatore e ricarica la lista commenti', async () => {
    setFakeRpc({});
    const { Wrapper, client } = createQueryWrapper();
    client.setQueryData(['feed'], { pages: [[post()]], pageParams: [undefined] });
    const invalidated = spyOnInvalidations(client);
    const { result } = await renderHook(() => useDeleteComment('p1'), { wrapper: Wrapper });
    await act(async () => {
      result.current.mutate('c1');
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const feed = client.getQueryData<{ pages: { commentCount: number }[][] }>(['feed']);
    expect(feed?.pages[0]?.[0]?.commentCount).toBe(1);
    expect(invalidated()).toContainEqual(['postComments', 'p1']);
  });

  it('pubblicare un post ricarica feed, storie, foto in chat e stanze', async () => {
    setFakeRpc({
      create_post: [{ post_id: 'p9', visible_from: 'x', expires_at: 'y' }],
    });
    const { Wrapper, client } = createQueryWrapper();
    const invalidated = spyOnInvalidations(client);
    const { result } = await renderHook(() => useCreatePost(), { wrapper: Wrapper });
    await act(async () => {
      result.current.mutate({ userId: 'u1', caption: 'ciao', cleanUri: null, roomId: null });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidated()).toEqual(
      expect.arrayContaining([
        ['feed'],
        ['stories'],
        ['storyPosts'],
        ['chatMessages'],
        ['chatRooms'],
      ]),
    );
  });

  it('cancellare un post lo toglie subito da feed e storie e ricarica feed e storie', async () => {
    setFakeRpc({});
    const { Wrapper, client } = createQueryWrapper();
    client.setQueryData(['feed'], {
      pages: [[post(), post({ id: 'p2' })]],
      pageParams: [undefined],
    });
    const invalidated = spyOnInvalidations(client);
    const { result } = await renderHook(() => useDeletePost(), { wrapper: Wrapper });
    await act(async () => {
      result.current.mutate('p1');
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const feed = client.getQueryData<{ pages: { id: string }[][] }>(['feed']);
    expect(feed?.pages[0]?.map((p) => p.id)).toEqual(['p2']);
    expect(invalidated()).toEqual(expect.arrayContaining([['feed'], ['stories'], ['storyPosts']]));
  });
});

describe('profilo e handle', () => {
  beforeEach(() =>
    useAuthStore.setState({
      initialized: true,
      session: { userId: 'user-1', email: 'lince@example.com', emailConfirmed: true },
    }),
  );

  it('salvare il profilo ricarica il profilo e la serata consigliata (dipende da età e genere)', async () => {
    setFakeRpc({});
    const { Wrapper, client } = createQueryWrapper();
    const invalidated = spyOnInvalidations(client);
    const { result } = await renderHook(() => useSaveProfile(), { wrapper: Wrapper });
    await act(async () => {
      expect(await result.current(PROFILE_INPUT)).toBeNull();
    });
    expect(invalidated()).toEqual(
      expect.arrayContaining([['profile', 'me', 'user-1'], ['recommendedVenue']]),
    );
  });

  it("cambiare l'handle ricarica il profilo e ogni punto dove compare il mio @tag", async () => {
    setFakeRpc({ regenerate_handle: 'gatto.blu' });
    const { Wrapper, client } = createQueryWrapper();
    const invalidated = spyOnInvalidations(client);
    const { result } = await renderHook(() => useRegenerateHandle(), { wrapper: Wrapper });
    await act(async () => {
      expect(await result.current()).toBeNull();
    });
    expect(invalidated()).toEqual(
      expect.arrayContaining([
        ['profile', 'me', 'user-1'],
        ['feed'],
        ['stories'],
        ['storyPosts'],
        ['postComments'],
        ['chatMessages'],
      ]),
    );
  });
});
