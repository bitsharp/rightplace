import { act, renderHook, waitFor } from '@testing-library/react-native';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { useNotificationStore } from '@/features/notifications/store/notificationStore';

import { storyKey } from './domain/stories';
import { useSeenStories } from './store/seenStories';
import { useTopBar } from './useTopBar';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useIsFocused: () => true,
  usePathname: () => '/map',
}));
jest.mock('@/features/auth/useSession', () => ({
  useSession: () => ({ userId: 'me', profile: { handle: 'lince.rosso' } }),
}));

const TARGET = [
  { night_id: 'n1', event_id: null, venue_name: 'Arena', night_date: '2026-11-08', room_id: null },
];
const STORY = { user_id: 'u2', handle: 'volpe.viola', latest_post_at: '2026-11-09T09:00:00Z' };
const MY_POST = {
  post_id: 'p1',
  author_id: 'me',
  author_handle: 'lince.rosso',
  venue_name: 'Arena',
  night_date: '2026-11-08',
  caption: 'x',
  has_photo: false,
  visible_from: '2026-11-10T05:00:00Z',
  expires_at: '2026-11-17T05:00:00Z',
  like_count: 0,
  comment_count: 0,
  liked_by_me: false,
  is_mine: true,
};

function seed(rpcs: Record<string, unknown>) {
  setFakeRpc({ get_post_target: [], get_stories: [], get_story_posts: [], ...rpcs });
}

describe('useTopBar', () => {
  beforeEach(() => mockPush.mockClear());

  it('senza una serata recente non c’è il "+"', async () => {
    seed({});
    const { result } = await renderHook(() => useTopBar(), {
      wrapper: createQueryWrapper().Wrapper,
    });
    await waitFor(() => expect(result.current.stories).toEqual([]));
    expect(result.current.canPost).toBe(false);
  });

  it('espone l’apertura del feedback', async () => {
    seed({});
    const { result } = await renderHook(() => useTopBar(), {
      wrapper: createQueryWrapper().Wrapper,
    });
    expect(result.current.onOpenFeedback).toEqual(expect.any(Function));
  });

  it('con una serata recente indicata dal server c’è il "+"', async () => {
    seed({ get_post_target: TARGET });
    const { result } = await renderHook(() => useTopBar(), {
      wrapper: createQueryWrapper().Wrapper,
    });
    await waitFor(() => expect(result.current.canPost).toBe(true));
  });

  it('"La tua storia" compare solo con miei post delle ultime 24 ore', async () => {
    seed({ get_story_posts: [MY_POST] });
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useTopBar(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.stories[0]).toMatchObject({ id: 'me', mine: true }));
  });

  it('le storie portano la foto firmata per me (una sola richiesta, la mia compresa)', async () => {
    seed({ get_stories: [STORY], get_story_posts: [MY_POST] });
    fakeSupabase.functions.invoke.mockResolvedValue({
      data: {
        urls: [
          { userId: 'me', url: 'https://signed.test/a/me' },
          { userId: 'u2', url: 'https://signed.test/a/u2' },
        ],
      },
      error: null,
    });
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useTopBar(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.stories[1]?.photo).toBeDefined());
    expect(result.current.stories[0]?.photo).toEqual({
      uri: 'https://signed.test/a/me',
      cacheKey: 'me',
    });
    expect(result.current.stories[1]?.photo).toEqual({
      uri: 'https://signed.test/a/u2',
      cacheKey: 'u2',
    });
    const last = fakeSupabase.functions.invoke.mock.calls.at(-1);
    expect(last).toEqual(['avatar-urls', { body: { userIds: ['me', 'u2'] } }]);
  });

  it('espone la mia foto per la barra, nella stessa richiesta degli id extra della schermata', async () => {
    seed({});
    fakeSupabase.functions.invoke.mockResolvedValue({
      data: {
        urls: [
          { userId: 'me', url: 'https://signed.test/a/me' },
          { userId: 'u-amico', url: 'https://signed.test/a/u-amico' },
        ],
      },
      error: null,
    });
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useTopBar(['u-amico']), { wrapper: Wrapper });
    await waitFor(() =>
      expect(result.current.myPhoto).toEqual({ uri: 'https://signed.test/a/me', cacheKey: 'me' }),
    );
    expect(result.current.avatarUrls['u-amico']).toBe('https://signed.test/a/u-amico');
    const calls = fakeSupabase.functions.invoke.mock.calls.filter(
      ([name]) => name === 'avatar-urls',
    );
    expect(calls.at(-1)).toEqual(['avatar-urls', { body: { userIds: ['me', 'u-amico'] } }]);
  });

  it('senza URL firmato la storia resta senza foto (iniziale)', async () => {
    seed({ get_stories: [STORY] });
    fakeSupabase.functions.invoke.mockResolvedValue({ data: { urls: [] }, error: null });
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useTopBar(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.stories[0]).toMatchObject({ id: 'u2' }));
    await waitFor(() => expect(fakeSupabase.functions.invoke).toHaveBeenCalled());
    expect(result.current.stories[0]?.photo).toBeUndefined();
  });

  it('il pallino delle novità c’è finché una storia degli altri non è stata vista', async () => {
    seed({ get_stories: [STORY] });
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useTopBar(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.hasNews).toBe(true));
    expect(result.current.stories[0]).toMatchObject({ id: 'u2', seen: false });
    useSeenStories.getState().markSeen(storyKey('u2', STORY.latest_post_at));
    await waitFor(() => expect(result.current.hasNews).toBe(false));
    expect(result.current.stories[0]).toMatchObject({ id: 'u2', seen: true });
  });

  it('il pallino si accende anche per like, commenti e richieste non ancora visti', async () => {
    seed({
      get_my_activity: [
        {
          kind: 'like',
          actor_handle: 'volpe.viola',
          actor_id: 'u-volpe.viola',
          post_id: 'p1',
          created_at: '2026-11-13T10:00:00Z',
        },
      ],
    });
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useTopBar(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.hasNews).toBe(true));
    await act(async () => useNotificationStore.getState().markActivitySeen('2026-11-13T10:00:00Z'));
    await waitFor(() => expect(result.current.hasNews).toBe(false));
  });

  it('apre il post, il profilo, la schermata Novità e il viewer della storia giusta', async () => {
    seed({});
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useTopBar(), { wrapper: Wrapper });
    result.current.onPost();
    expect(mockPush).toHaveBeenLastCalledWith('/post/new');
    result.current.onOpenProfile();
    expect(mockPush).toHaveBeenLastCalledWith('/profile');
    result.current.onOpenNews();
    expect(mockPush).toHaveBeenLastCalledWith('/activity');
    result.current.onOpenStory('u2');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/story/[userId]',
      params: { userId: 'u2' },
    });
    result.current.onOpenStory('me');
    expect(mockPush).toHaveBeenLastCalledWith({
      pathname: '/story/[userId]',
      params: { userId: 'me' },
    });
  });
});
