import { renderHook, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from 'expo-router';
import { act } from 'react';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import type { Following, FollowRequest, SearchResult } from './api';
import {
  BLOCKED_KEY,
  FOLLOW_REQUESTS_COUNT_KEY,
  FOLLOW_REQUESTS_KEY,
  FOLLOWERS_KEY,
  FOLLOWING_KEY,
  FOLLOWING_REFETCH_MS,
  USER_SEARCH_DEBOUNCE_MS,
  useAcceptFollow,
  useBlockedUsers,
  useBlockUser,
  useCancelFollowRequest,
  useDeclineFollow,
  useFollowers,
  useFollowing,
  useFollowRequests,
  useFollowRequestsCount,
  useRemoveFollower,
  useRequestFollow,
  useUnblockUser,
  useUnfollow,
  useUserSearch,
} from './hooks';

jest.mock('expo-router', () => ({ useIsFocused: jest.fn() }));

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

// An RPC that stays pending until the test releases it: shows the state *during* the mutation.
function holdRpc(name: string) {
  let release: (error?: unknown) => void = () => undefined;
  const gate = new Promise<{ data: unknown; error: unknown }>((resolve) => {
    release = (error) => resolve({ data: null, error: error ?? null });
  });
  fakeSupabase.rpc.mockImplementation(async (called: string) =>
    called === name ? gate : { data: null, error: null },
  );
  return release;
}

const searchRow = (overrides: Record<string, unknown> = {}) => ({
  user_id: 'u1',
  handle: 'volpe.viola',
  age_band: '18-24',
  gender: 'female',
  is_creator: false,
  follow_state: 'none',
  follows_me: false,
  tonight_venue_id: null,
  tonight_venue_name: null,
  ...overrides,
});

const result = (overrides: Partial<SearchResult> = {}): SearchResult => ({
  userId: 'u1',
  handle: 'volpe.viola',
  ageBand: '18-24',
  gender: 'female',
  isCreator: false,
  followState: 'none',
  followsMe: false,
  tonightVenueId: null,
  tonightVenueName: null,
  ...overrides,
});

const followingRow = (id: string) => ({
  user_id: id,
  handle: `animale.${id}`,
  age_band: '25-34',
  gender: 'male',
  is_creator: false,
  follows_me: false,
  tonight_venue_id: null,
  tonight_venue_name: null,
  followed_at: '2026-11-01T10:00:00Z',
});

const request = (id: string): FollowRequest => ({
  userId: id,
  handle: `animale.${id}`,
  ageBand: '18-24',
  gender: 'other',
  isCreator: false,
  requestedAt: '2026-11-03T10:00:00Z',
});

describe('useUserSearch', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setFakeRpc({ search_users: [searchRow()] });
  });
  afterEach(() => jest.useRealTimers());

  it('non cerca con meno di due caratteri', async () => {
    const { Wrapper } = createQueryWrapper();
    await renderHook(() => useUserSearch('v'), { wrapper: Wrapper });
    await act(async () => jest.advanceTimersByTime(USER_SEARCH_DEBOUNCE_MS * 2));
    expect(rpcCalls('search_users')).toHaveLength(0);
  });

  it('aspetta 300 ms dall’ultimo carattere prima di chiamare il server', async () => {
    expect(USER_SEARCH_DEBOUNCE_MS).toBe(300);
    const { Wrapper } = createQueryWrapper();
    const { rerender } = await renderHook((text: string) => useUserSearch(text), {
      wrapper: Wrapper,
      initialProps: 'vo',
    });
    await act(async () => jest.advanceTimersByTime(200));
    await rerender('vol');
    await act(async () => jest.advanceTimersByTime(200));
    expect(rpcCalls('search_users')).toHaveLength(0);
    await act(async () => jest.advanceTimersByTime(100));
    await waitFor(() => expect(rpcCalls('search_users')).toHaveLength(1));
    expect(rpcCalls('search_users')[0]?.[1]).toEqual({ p_query: 'vol' });
  });

  it('usa la query normalizzata come chiave e non scrive su disco', async () => {
    const { Wrapper, client } = createQueryWrapper();
    const hook = await renderHook(() => useUserSearch(' @Volpe '), { wrapper: Wrapper });
    await act(async () => jest.advanceTimersByTime(USER_SEARCH_DEBOUNCE_MS));
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    const query = client.getQueryCache().find({ queryKey: ['userSearch', 'volpe'] });
    expect(query?.meta).toEqual({ persist: false });
  });
});

describe('liste', () => {
  it('useFollowing usa la chiave dei seguiti e non scrive su disco', async () => {
    jest.mocked(useIsFocused).mockReturnValue(true);
    setFakeRpc({ get_following: [followingRow('a')] });
    const { Wrapper, client } = createQueryWrapper();
    const hook = await renderHook(() => useFollowing(), { wrapper: Wrapper });
    await waitFor(() => expect(hook.result.current.data).toHaveLength(1));
    expect(client.getQueryCache().find({ queryKey: FOLLOWING_KEY })?.meta).toEqual({
      persist: false,
    });
    expect(FOLLOWING_KEY).toEqual(['friends', 'following']);
  });

  it('useFollowers, useBlockedUsers e useFollowRequests leggono le proprie RPC', async () => {
    setFakeRpc({
      get_followers: [],
      get_blocked_users: [],
      get_follow_requests: [],
      count_follow_requests: 4,
    });
    const { Wrapper, client } = createQueryWrapper();
    const followers = await renderHook(() => useFollowers(), { wrapper: Wrapper });
    const blocked = await renderHook(() => useBlockedUsers(), { wrapper: Wrapper });
    const requests = await renderHook(() => useFollowRequests(), { wrapper: Wrapper });
    const count = await renderHook(() => useFollowRequestsCount(), { wrapper: Wrapper });
    await waitFor(() => expect(count.result.current.data).toBe(4));
    await waitFor(() => expect(followers.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(blocked.result.current.isSuccess).toBe(true));
    await waitFor(() => expect(requests.result.current.isSuccess).toBe(true));
    [FOLLOWERS_KEY, BLOCKED_KEY, FOLLOW_REQUESTS_KEY, FOLLOW_REQUESTS_COUNT_KEY].forEach((key) =>
      expect(client.getQueryCache().find({ queryKey: key })?.meta).toEqual({ persist: false }),
    );
  });
});

describe('useFollowing: aggiornamento dei dati che dipendono dai seguiti', () => {
  beforeEach(() => jest.mocked(useIsFocused).mockReturnValue(true));

  it('quando compare un nuovo seguito ricarica mappa amici, feed, storie e statistiche', async () => {
    setFakeRpc({ get_following: [followingRow('a'), followingRow('b')] });
    const { Wrapper, client } = createQueryWrapper();
    client.setQueryData<Following[]>(FOLLOWING_KEY, [
      {
        ...result(),
        userId: 'a',
        followsMe: false,
        followedAt: 'x',
        tonightVenueId: null,
        tonightVenueName: null,
      },
    ]);
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    await renderHook(() => useFollowing(), { wrapper: Wrapper });
    await waitFor(() => expect(invalidate).toHaveBeenCalled());
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([['cityMap'], ['feed'], ['stories'], ['venueStats']]),
    );
  });

  it('se i seguiti non cambiano non ricarica nulla', async () => {
    setFakeRpc({ get_following: [followingRow('a')] });
    const { Wrapper, client } = createQueryWrapper();
    const hook = await renderHook(() => useFollowing(), { wrapper: Wrapper });
    await waitFor(() => expect(hook.result.current.isSuccess).toBe(true));
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    await act(async () => {
      await hook.result.current.refetch();
    });
    expect(invalidate).not.toHaveBeenCalled();
  });

  it('ricontrolla ogni 60 secondi a schermata a fuoco', async () => {
    jest.useFakeTimers();
    setFakeRpc({ get_following: [] });
    const { Wrapper } = createQueryWrapper();
    await renderHook(() => useFollowing(), { wrapper: Wrapper });
    await waitFor(() => expect(rpcCalls('get_following')).toHaveLength(1));
    await act(async () => jest.advanceTimersByTime(FOLLOWING_REFETCH_MS));
    await waitFor(() => expect(rpcCalls('get_following')).toHaveLength(2));
    expect(FOLLOWING_REFETCH_MS).toBe(60_000);
    jest.useRealTimers();
  });
});

describe('useRequestFollow', () => {
  const seed = (client: ReturnType<typeof createQueryWrapper>['client'], row = result()) =>
    client.setQueryData<SearchResult[]>(['userSearch', 'volpe'], [row]);

  it('mostra subito "pending" senza toccare il locale di stasera', async () => {
    const release = holdRpc('request_follow');
    const { Wrapper, client } = createQueryWrapper();
    seed(client);
    const { result: hook } = await renderHook(() => useRequestFollow(), { wrapper: Wrapper });
    await act(async () => {
      hook.current.mutate('u1');
    });
    const [row] = client.getQueryData<SearchResult[]>(['userSearch', 'volpe']) ?? [];
    expect(row?.followState).toBe('pending');
    expect(row?.tonightVenueId).toBeNull();
    expect(row?.tonightVenueName).toBeNull();
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    await act(async () => release());
  });

  it('se il server rifiuta, torna a "none"', async () => {
    const release = holdRpc('request_follow');
    const { Wrapper, client } = createQueryWrapper();
    seed(client);
    const { result: hook } = await renderHook(() => useRequestFollow(), { wrapper: Wrapper });
    await act(async () => {
      hook.current.mutate('u1');
    });
    await act(async () => release({ message: 'BLOCKED' }));
    await waitFor(() => expect(hook.current.isError).toBe(true));
    expect(client.getQueryData<SearchResult[]>(['userSearch', 'volpe'])?.[0]?.followState).toBe(
      'none',
    );
  });

  it('non modifica gli altri utenti della lista', async () => {
    const release = holdRpc('request_follow');
    const { Wrapper, client } = createQueryWrapper();
    client.setQueryData<SearchResult[]>(
      ['userSearch', 'volpe'],
      [result(), result({ userId: 'u2', handle: 'volpe.nera' })],
    );
    const { result: hook } = await renderHook(() => useRequestFollow(), { wrapper: Wrapper });
    await act(async () => {
      hook.current.mutate('u1');
    });
    const rows = client.getQueryData<SearchResult[]>(['userSearch', 'volpe']) ?? [];
    expect(rows.map((row) => row.followState)).toEqual(['pending', 'none']);
    await act(async () => release());
  });

  it('a fine chiamata ricarica la ricerca per prendere lo stato vero dal server', async () => {
    setFakeRpc({});
    const { Wrapper, client } = createQueryWrapper();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result: hook } = await renderHook(() => useRequestFollow(), { wrapper: Wrapper });
    await act(async () => {
      hook.current.mutate('u1');
    });
    await waitFor(() => expect(hook.current.isSuccess).toBe(true));
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).toContainEqual([
      'userSearch',
    ]);
  });
});

describe('useCancelFollowRequest', () => {
  it('ritira subito la richiesta e ripristina "pending" se il server fallisce', async () => {
    const release = holdRpc('cancel_follow_request');
    const { Wrapper, client } = createQueryWrapper();
    client.setQueryData<SearchResult[]>(
      ['userSearch', 'volpe'],
      [result({ followState: 'pending' })],
    );
    const { result: hook } = await renderHook(() => useCancelFollowRequest(), { wrapper: Wrapper });
    await act(async () => {
      hook.current.mutate('u1');
    });
    expect(client.getQueryData<SearchResult[]>(['userSearch', 'volpe'])?.[0]?.followState).toBe(
      'none',
    );
    await act(async () => release({ message: 'UNKNOWN' }));
    await waitFor(() => expect(hook.current.isError).toBe(true));
    expect(client.getQueryData<SearchResult[]>(['userSearch', 'volpe'])?.[0]?.followState).toBe(
      'pending',
    );
  });
});

describe('richieste ricevute', () => {
  const seedRequests = (client: ReturnType<typeof createQueryWrapper>['client']) => {
    client.setQueryData<FollowRequest[]>(FOLLOW_REQUESTS_KEY, [request('a'), request('b')]);
    client.setQueryData<number>(FOLLOW_REQUESTS_COUNT_KEY, 2);
  };

  it('accettare toglie subito la richiesta e scala il contatore', async () => {
    const release = holdRpc('accept_follow');
    const { Wrapper, client } = createQueryWrapper();
    seedRequests(client);
    const { result: hook } = await renderHook(() => useAcceptFollow(), { wrapper: Wrapper });
    await act(async () => {
      hook.current.mutate('a');
    });
    expect(client.getQueryData<FollowRequest[]>(FOLLOW_REQUESTS_KEY)?.map((r) => r.userId)).toEqual(
      ['b'],
    );
    expect(client.getQueryData(FOLLOW_REQUESTS_COUNT_KEY)).toBe(1);
    expect(Haptics.notificationAsync).toHaveBeenCalled();
    await act(async () => release());
  });

  it('accettare ricarica anche l’elenco dei follower', async () => {
    setFakeRpc({});
    const { Wrapper, client } = createQueryWrapper();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result: hook } = await renderHook(() => useAcceptFollow(), { wrapper: Wrapper });
    await act(async () => {
      hook.current.mutate('a');
    });
    await waitFor(() => expect(hook.current.isSuccess).toBe(true));
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toEqual(expect.arrayContaining([FOLLOWERS_KEY, ['followRequests']]));
  });

  it('se accettare fallisce, la richiesta torna in lista', async () => {
    const release = holdRpc('accept_follow');
    const { Wrapper, client } = createQueryWrapper();
    seedRequests(client);
    const { result: hook } = await renderHook(() => useAcceptFollow(), { wrapper: Wrapper });
    await act(async () => {
      hook.current.mutate('a');
    });
    await act(async () => release({ message: 'NOT_FOUND' }));
    await waitFor(() => expect(hook.current.isError).toBe(true));
    expect(client.getQueryData<FollowRequest[]>(FOLLOW_REQUESTS_KEY)).toHaveLength(2);
    expect(client.getQueryData(FOLLOW_REQUESTS_COUNT_KEY)).toBe(2);
  });

  it('rifiutare toglie subito la richiesta senza ricaricare i follower', async () => {
    const release = holdRpc('decline_follow');
    const { Wrapper, client } = createQueryWrapper();
    seedRequests(client);
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result: hook } = await renderHook(() => useDeclineFollow(), { wrapper: Wrapper });
    await act(async () => {
      hook.current.mutate('b');
    });
    expect(client.getQueryData<FollowRequest[]>(FOLLOW_REQUESTS_KEY)?.map((r) => r.userId)).toEqual(
      ['a'],
    );
    await act(async () => release());
    await waitFor(() => expect(hook.current.isSuccess).toBe(true));
    expect(invalidate.mock.calls.map(([filters]) => filters?.queryKey)).not.toContainEqual(
      FOLLOWERS_KEY,
    );
  });
});

describe('unfollow, rimuovi follower, blocca, sblocca', () => {
  const invalidatedKeys = async (
    run: () => Promise<void>,
    client: ReturnType<typeof createQueryWrapper>['client'],
  ) => {
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    await run();
    return invalidate.mock.calls.map(([filters]) => filters?.queryKey);
  };

  it('unfollow ricarica seguiti, ricerca e tutto ciò che dipende dai seguiti', async () => {
    setFakeRpc({});
    const { Wrapper, client } = createQueryWrapper();
    const { result: hook } = await renderHook(() => useUnfollow(), { wrapper: Wrapper });
    const keys = await invalidatedKeys(async () => {
      await act(async () => {
        hook.current.mutate('u1');
      });
      await waitFor(() => expect(hook.current.isSuccess).toBe(true));
    }, client);
    expect(keys).toEqual(
      expect.arrayContaining([
        FOLLOWING_KEY,
        ['userSearch'],
        ['cityMap'],
        ['feed'],
        ['stories'],
        ['venueStats'],
      ]),
    );
  });

  it('removeFollower ricarica i follower', async () => {
    setFakeRpc({});
    const { Wrapper, client } = createQueryWrapper();
    const { result: hook } = await renderHook(() => useRemoveFollower(), { wrapper: Wrapper });
    const keys = await invalidatedKeys(async () => {
      await act(async () => {
        hook.current.mutate('u1');
      });
      await waitFor(() => expect(hook.current.isSuccess).toBe(true));
    }, client);
    expect(keys).toEqual(expect.arrayContaining([FOLLOWERS_KEY, ['userSearch']]));
    expect(rpcCalls('remove_follower')[0]?.[1]).toEqual({ p_follower_id: 'u1' });
  });

  it('block_user ricarica tutte le liste, i bloccati e i dati degli amici', async () => {
    setFakeRpc({});
    const { Wrapper, client } = createQueryWrapper();
    const { result: hook } = await renderHook(() => useBlockUser(), { wrapper: Wrapper });
    const keys = await invalidatedKeys(async () => {
      await act(async () => {
        hook.current.mutate('u1');
      });
      await waitFor(() => expect(hook.current.isSuccess).toBe(true));
    }, client);
    expect(keys).toEqual(
      expect.arrayContaining([
        FOLLOWING_KEY,
        FOLLOWERS_KEY,
        BLOCKED_KEY,
        ['followRequests'],
        ['userSearch'],
        ['cityMap'],
        ['feed'],
      ]),
    );
  });

  it('unblock_user ricarica bloccati e ricerca', async () => {
    setFakeRpc({});
    const { Wrapper, client } = createQueryWrapper();
    const { result: hook } = await renderHook(() => useUnblockUser(), { wrapper: Wrapper });
    const keys = await invalidatedKeys(async () => {
      await act(async () => {
        hook.current.mutate('u1');
      });
      await waitFor(() => expect(hook.current.isSuccess).toBe(true));
    }, client);
    expect(keys).toEqual(expect.arrayContaining([BLOCKED_KEY, ['userSearch']]));
  });
});
