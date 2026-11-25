import { act, renderHook, waitFor } from '@testing-library/react-native';
import type { InfiniteData } from '@tanstack/react-query';

import { CHAT_MESSAGES_ROOT_KEY, CHAT_ROOMS_KEY } from '@/features/chat/keys';
import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import type { FeedPost } from './domain/types';
import {
  useAddComment,
  useComments,
  useCreatePost,
  useDeleteComment,
  useDeletePost,
  useFeed,
  usePostPhotoUrls,
  usePostTarget,
  useStoryPosts,
  useToggleLike,
  useUserPosts,
} from './hooks';
import { FEED_KEY, STORIES_KEY, storyPostsKey, USER_POSTS_ROOT_KEY, userPostsKey } from './keys';

jest.mock('expo-router', () => ({ useIsFocused: jest.fn(() => true) }));
jest.mock('@/lib/photos/photos', () => ({ uploadPhoto: jest.fn(async () => 'me/x.jpg') }));

const row = (id: string, overrides: Record<string, unknown> = {}) => ({
  post_id: id,
  author_id: 'u1',
  author_handle: 'volpe.viola',
  venue_name: 'Arena Club',
  night_date: '2026-11-08',
  caption: id,
  has_photo: false,
  visible_from: '2026-11-09T05:00:00.5+00:00',
  expires_at: '2026-11-16T05:00:00+00:00',
  like_count: 2,
  comment_count: 1,
  liked_by_me: false,
  is_mine: false,
  ...overrides,
});

const post = (id: string, overrides: Partial<FeedPost> = {}): FeedPost => ({
  id,
  authorId: 'u1',
  authorHandle: 'volpe.viola',
  venueName: 'Arena Club',
  nightDate: '2026-11-08',
  caption: id,
  hasPhoto: false,
  visibleFrom: '2026-11-09T05:00:00.5+00:00',
  expiresAt: '2026-11-16T05:00:00+00:00',
  likeCount: 2,
  commentCount: 1,
  likedByMe: false,
  isMine: false,
  ...overrides,
});

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

describe('usePostTarget', () => {
  it('legge il bersaglio e non lo salva su disco', async () => {
    setFakeRpc({
      get_post_target: [
        {
          night_id: 'n1',
          event_id: null,
          venue_name: 'Arena',
          night_date: '2026-11-08',
          room_id: null,
        },
      ],
    });
    const { Wrapper, client } = createQueryWrapper();
    const { result } = await renderHook(() => usePostTarget(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data?.venueName).toBe('Arena'));
    expect(client.getQueryCache().find({ queryKey: ['postTarget'] })?.meta).toEqual({
      persist: false,
    });
  });
});

describe('useFeed', () => {
  it('con una pagina piena la successiva riparte dal cursore composto (visible_from + id)', async () => {
    const full = Array.from({ length: 20 }, (_, i) => row(`p${i}`));
    setFakeRpc({
      get_feed: (args: unknown) =>
        (args as { p_before_id: string | null }).p_before_id ? [] : full,
    });
    const { Wrapper, client } = createQueryWrapper();
    const { result } = await renderHook(() => useFeed(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.posts).toHaveLength(20));
    expect(result.current.hasMore).toBe(true);
    await act(async () => result.current.loadMore());
    expect(rpcCalls('get_feed')[1]?.[1]).toEqual({
      p_before_visible: '2026-11-09T05:00:00.5+00:00',
      p_before_id: 'p19',
      p_limit: 20,
    });
    await waitFor(() => expect(result.current.hasMore).toBe(false));
    expect(client.getQueryCache().find({ queryKey: FEED_KEY })?.meta).toEqual({ persist: false });
  });

  it('una pagina incompleta chiude il feed', async () => {
    setFakeRpc({ get_feed: [row('a')] });
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useFeed(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.posts).toHaveLength(1));
    expect(result.current.hasMore).toBe(false);
  });
});

describe('indicatore di ricarica del feed', () => {
  // A refetch the test can hold open, to observe the state while the request is in flight.
  const holdNextFeedRequest = () => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    fakeSupabase.rpc.mockImplementationOnce(async () => {
      await held;
      return { data: [row('a')], error: null };
    });
    return release;
  };
  const setup = async () => {
    setFakeRpc({ get_feed: [row('a')] });
    const { Wrapper, client } = createQueryWrapper();
    const rendered = await renderHook(() => useFeed(), { wrapper: Wrapper });
    await waitFor(() => expect(rendered.result.current.posts).toHaveLength(1));
    return { ...rendered, client };
  };

  it('un refetch in background (focus, invalidazione) non accende lo spinner di pull-to-refresh', async () => {
    const { result, client } = await setup();
    const release = holdNextFeedRequest();
    void client.invalidateQueries({ queryKey: FEED_KEY });
    await waitFor(() => expect(client.isFetching()).toBe(1));
    expect(result.current.isRefreshing).toBe(false);
    await act(async () => release());
    await waitFor(() => expect(client.isFetching()).toBe(0));
  });

  it('il pull-to-refresh manuale lo accende e lo spegne a ricarica finita', async () => {
    const { result, client } = await setup();
    const release = holdNextFeedRequest();
    let pending: Promise<void> = Promise.resolve();
    await act(async () => {
      pending = result.current.refresh();
    });
    await waitFor(() => expect(result.current.isRefreshing).toBe(true));
    await act(async () => {
      release();
      await pending;
    });
    expect(result.current.isRefreshing).toBe(false);
    expect(client.isFetching()).toBe(0);
  });

  it('un refresh fallito non lascia lo spinner acceso', async () => {
    const { result } = await setup();
    fakeSupabase.rpc.mockImplementationOnce(async () => ({
      data: null,
      error: { message: 'offline', code: '' },
    }));
    await act(async () => result.current.refresh());
    expect(result.current.isRefreshing).toBe(false);
  });
});

describe('useUserPosts', () => {
  it('con una pagina piena la successiva riparte dal cursore composto e non va su disco', async () => {
    const full = Array.from({ length: 30 }, (_, i) => row(`p${i}`));
    setFakeRpc({
      get_user_posts: (args: unknown) =>
        (args as { p_before_id: string | null }).p_before_id ? [row('last')] : full,
    });
    const { Wrapper, client } = createQueryWrapper();
    const { result } = await renderHook(() => useUserPosts('u1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.posts).toHaveLength(30));
    expect(result.current.hasMore).toBe(true);
    await act(async () => result.current.loadMore());
    expect(rpcCalls('get_user_posts')[1]?.[1]).toEqual({
      p_user_id: 'u1',
      p_before_visible: '2026-11-09T05:00:00.5+00:00',
      p_before_id: 'p29',
      p_limit: 30,
    });
    await waitFor(() => expect(result.current.posts).toHaveLength(31));
    expect(result.current.hasMore).toBe(false);
    expect(client.getQueryCache().find({ queryKey: userPostsKey('u1') })?.meta).toEqual({
      persist: false,
    });
  });

  it('disabilitato (profilo privato o senza id) non chiama il server', async () => {
    setFakeRpc({ get_user_posts: [row('a')] });
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useUserPosts('u1', false), { wrapper: Wrapper });
    await renderHook(() => useUserPosts(''), { wrapper: Wrapper });
    expect(result.current.posts).toEqual([]);
    expect(rpcCalls('get_user_posts')).toHaveLength(0);
  });
});

describe('useToggleLike', () => {
  const seed = (client: ReturnType<typeof createQueryWrapper>['client']) => {
    client.setQueryData<InfiniteData<FeedPost[], unknown>>(FEED_KEY, {
      pages: [[post('p1'), post('p2')]],
      pageParams: [undefined],
    });
    client.setQueryData<FeedPost[]>(storyPostsKey('u1'), [post('p1')]);
  };
  const feedPost = (client: ReturnType<typeof createQueryWrapper>['client'], id: string) =>
    client.getQueryData<InfiniteData<FeedPost[]>>(FEED_KEY)?.pages[0]?.find((p) => p.id === id);

  it('aggiorna subito il like in feed e storie, poi il contatore del server', async () => {
    // The server answers only when the test says so, to observe the optimistic state in between.
    let answer: (rows: unknown) => void = () => undefined;
    fakeSupabase.rpc.mockReturnValueOnce(
      new Promise((resolve) => {
        answer = (data) => resolve({ data, error: null });
      }) as never,
    );
    const { Wrapper, client } = createQueryWrapper();
    seed(client);
    const { result } = await renderHook(() => useToggleLike(), { wrapper: Wrapper });
    await act(async () => result.current.mutate({ postId: 'p1', liked: true }));
    await waitFor(() =>
      expect(feedPost(client, 'p1')).toMatchObject({ likedByMe: true, likeCount: 3 }),
    );
    expect(rpcCalls('set_post_like')).toHaveLength(1);
    expect(client.getQueryData<FeedPost[]>(storyPostsKey('u1'))?.[0]).toMatchObject({
      likedByMe: true,
    });
    await act(async () => answer([{ like_count: 5, liked_by_me: true }]));
    await waitFor(() => expect(feedPost(client, 'p1')?.likeCount).toBe(5));
    expect(feedPost(client, 'p2')).toMatchObject({ likedByMe: false, likeCount: 2 });
  });

  it('se la RPC fallisce ripristina lo stato di prima', async () => {
    fakeSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'POST_NOT_FOUND' } });
    const { Wrapper, client } = createQueryWrapper();
    seed(client);
    const { result } = await renderHook(() => useToggleLike(), { wrapper: Wrapper });
    await act(async () => result.current.mutate({ postId: 'p1', liked: true }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(feedPost(client, 'p1')).toMatchObject({ likedByMe: false, likeCount: 2 });
    expect(client.getQueryData<FeedPost[]>(storyPostsKey('u1'))?.[0]).toMatchObject({
      likeCount: 2,
    });
  });
});

describe('useCreatePost', () => {
  it('pubblica e ricarica feed, storie, chat e stanze', async () => {
    setFakeRpc({
      create_post: [{ post_id: 'p9', visible_from: 'a', expires_at: 'b' }],
    });
    const { Wrapper, client } = createQueryWrapper();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useCreatePost(), { wrapper: Wrapper });
    await act(async () =>
      result.current.mutateAsync({ userId: 'me', caption: 'ciao', cleanUri: null, roomId: 'r1' }),
    );
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([
        FEED_KEY,
        STORIES_KEY,
        ['storyPosts'],
        USER_POSTS_ROOT_KEY,
        CHAT_MESSAGES_ROOT_KEY,
        CHAT_ROOMS_KEY,
      ]),
    );
  });
});

describe('commenti', () => {
  it('useComments mostra i più vecchi per primi e non salva nulla su disco', async () => {
    setFakeRpc({
      get_post_comments: [
        {
          comment_id: 'c2',
          user_id: 'u2',
          handle: 'gatto.blu',
          text: 'due',
          created_at: '2026-11-09T11:00:00Z',
          is_mine: false,
          can_delete: false,
        },
        {
          comment_id: 'c1',
          user_id: 'u3',
          handle: 'orso.verde',
          text: 'uno',
          created_at: '2026-11-09T10:00:00Z',
          is_mine: false,
          can_delete: false,
        },
      ],
    });
    const { Wrapper, client } = createQueryWrapper();
    const { result } = await renderHook(() => useComments('p1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.comments.map((c) => c.id)).toEqual(['c1', 'c2']));
    expect(client.getQueryCache().find({ queryKey: ['postComments', 'p1'] })?.meta).toEqual({
      persist: false,
    });
  });

  it('aggiungere un commento incrementa il contatore del post e ricarica la lista', async () => {
    setFakeRpc({
      add_post_comment: [{ comment_id: 'c9', created_at: 'x' }],
      get_post_comments: [],
    });
    const { Wrapper, client } = createQueryWrapper();
    client.setQueryData<InfiniteData<FeedPost[], unknown>>(FEED_KEY, {
      pages: [[post('p1')]],
      pageParams: [undefined],
    });
    const { result } = await renderHook(() => useAddComment('p1'), { wrapper: Wrapper });
    await act(async () => result.current.mutateAsync('ciao'));
    expect(
      client.getQueryData<InfiniteData<FeedPost[]>>(FEED_KEY)?.pages[0]?.[0]?.commentCount,
    ).toBe(2);
  });

  it('cancellare un commento lo decrementa (mai sotto zero)', async () => {
    setFakeRpc({ delete_post_comment: null, get_post_comments: [] });
    const { Wrapper, client } = createQueryWrapper();
    client.setQueryData<InfiniteData<FeedPost[], unknown>>(FEED_KEY, {
      pages: [[post('p1', { commentCount: 0 })]],
      pageParams: [undefined],
    });
    const { result } = await renderHook(() => useDeleteComment('p1'), { wrapper: Wrapper });
    await act(async () => result.current.mutateAsync('c1'));
    expect(
      client.getQueryData<InfiniteData<FeedPost[]>>(FEED_KEY)?.pages[0]?.[0]?.commentCount,
    ).toBe(0);
  });
});

describe('useDeletePost, useStoryPosts, usePostPhotoUrls', () => {
  it('eliminare un post lo toglie subito dal feed e ricarica le storie', async () => {
    setFakeRpc({ delete_post: null });
    const { Wrapper, client } = createQueryWrapper();
    client.setQueryData<InfiniteData<FeedPost[], unknown>>(FEED_KEY, {
      pages: [[post('p1'), post('p2')]],
      pageParams: [undefined],
    });
    const { result } = await renderHook(() => useDeletePost(), { wrapper: Wrapper });
    await act(async () => result.current.mutateAsync('p1'));
    expect(
      client.getQueryData<InfiniteData<FeedPost[]>>(FEED_KEY)?.pages[0]?.map((p) => p.id),
    ).toEqual(['p2']);
  });

  it('eliminare un post lo toglie subito anche dalla griglia del profilo', async () => {
    setFakeRpc({ delete_post: null });
    const { Wrapper, client } = createQueryWrapper();
    client.setQueryData<InfiniteData<FeedPost[], unknown>>(userPostsKey('me'), {
      pages: [[post('p1'), post('p2')]],
      pageParams: [undefined],
    });
    const { result } = await renderHook(() => useDeletePost(), { wrapper: Wrapper });
    await act(async () => result.current.mutateAsync('p1'));
    expect(
      client.getQueryData<InfiniteData<FeedPost[]>>(userPostsKey('me'))?.pages[0]?.map((p) => p.id),
    ).toEqual(['p2']);
  });

  it('le storie di una persona non vanno su disco', async () => {
    setFakeRpc({ get_story_posts: [row('s1')] });
    const { Wrapper, client } = createQueryWrapper();
    const { result } = await renderHook(() => useStoryPosts('u1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(client.getQueryCache().find({ queryKey: storyPostsKey('u1') })?.meta).toEqual({
      persist: false,
    });
  });

  it('gli URL firmati si chiedono una volta (50 min) e non vanno su disco', async () => {
    fakeSupabase.functions.invoke.mockResolvedValue({
      data: { urls: [{ postId: 'p1', url: 'https://signed.test/p1' }] },
      error: null,
    });
    const { Wrapper, client } = createQueryWrapper();
    const { result } = await renderHook(() => usePostPhotoUrls(['p1']), { wrapper: Wrapper });
    await waitFor(() => expect(result.current).toEqual({ p1: 'https://signed.test/p1' }));
    expect(client.getQueryCache().find({ queryKey: ['postPhotoUrls', 'p1'] })?.meta).toEqual({
      persist: false,
    });
  });
});
