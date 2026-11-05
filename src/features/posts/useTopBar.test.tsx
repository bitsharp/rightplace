import { renderHook, waitFor } from '@testing-library/react-native';

import { setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { storyKey } from './domain/stories';
import { useSeenStories } from './store/seenStories';
import { useTopBar } from './useTopBar';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useIsFocused: () => true,
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

  it('apre il post, il profilo, il feed e il viewer della storia giusta', async () => {
    seed({});
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useTopBar(), { wrapper: Wrapper });
    result.current.onPost();
    expect(mockPush).toHaveBeenLastCalledWith('/post/new');
    result.current.onOpenProfile();
    expect(mockPush).toHaveBeenLastCalledWith('/profile');
    result.current.onOpenNews();
    expect(mockPush).toHaveBeenLastCalledWith('/feed');
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
