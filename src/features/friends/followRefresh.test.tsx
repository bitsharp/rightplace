import { focusManager, type UseQueryResult } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { useIsFocused } from 'expo-router';
import { act } from 'react';

import { useFollowByHandle } from '@/features/chat/useFollowByHandle';
import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { spyOnInvalidations } from '@/test/invalidations';
import { createQueryWrapper } from '@/test/queryWrapper';

import {
  FOLLOWERS_KEY,
  FOLLOWING_KEY,
  useAcceptFollow,
  useCancelFollowRequest,
  useDeclineFollow,
  useFollowing,
  useFollowRequests,
  useFollowRequestsCount,
  useRequestFollow,
  useUserSearch,
} from './hooks';

jest.mock('expo-router', () => ({ useIsFocused: jest.fn() }));

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

const FOLLOW_DEPENDENTS = [['cityMap'], ['feed'], ['stories'], ['storyPosts']];

async function mutateAndCollect(
  useMutationHook: () => { mutate: (id: string) => void; isSuccess: boolean },
) {
  setFakeRpc({});
  const { Wrapper, client } = createQueryWrapper();
  const invalidated = spyOnInvalidations(client);
  const { result } = await renderHook(useMutationHook, { wrapper: Wrapper });
  await act(async () => {
    result.current.mutate('u1');
  });
  await waitFor(() => expect(result.current.isSuccess).toBe(true));
  return invalidated();
}

describe('mittente: dopo richiesta o ritiro si ricaricano i dati che dipendono dai seguiti', () => {
  it('request_follow ricarica seguiti, ricerca, mappa amici, feed e storie', async () => {
    const keys = await mutateAndCollect(useRequestFollow);
    expect(keys).toEqual(
      expect.arrayContaining([FOLLOWING_KEY, ['userSearch'], ...FOLLOW_DEPENDENTS]),
    );
  });

  it('cancel_follow_request ricarica seguiti, ricerca, mappa amici, feed e storie', async () => {
    const keys = await mutateAndCollect(useCancelFollowRequest);
    expect(keys).toEqual(
      expect.arrayContaining([FOLLOWING_KEY, ['userSearch'], ...FOLLOW_DEPENDENTS]),
    );
  });
});

describe('ricevente: dopo Accetta o Rifiuta', () => {
  it('accettare ricarica richieste, follower, seguiti e ricerca', async () => {
    const keys = await mutateAndCollect(useAcceptFollow);
    expect(keys).toEqual(
      expect.arrayContaining([['followRequests'], FOLLOWERS_KEY, FOLLOWING_KEY, ['userSearch']]),
    );
  });

  it('rifiutare ricarica richieste, seguiti e ricerca', async () => {
    const keys = await mutateAndCollect(useDeclineFollow);
    expect(keys).toEqual(
      expect.arrayContaining([['followRequests'], FOLLOWING_KEY, ['userSearch']]),
    );
  });
});

describe('ritorno in primo piano: i dati dei follow si ricaricano anche se ancora "freschi"', () => {
  beforeEach(() => jest.mocked(useIsFocused).mockReturnValue(true));

  const backgroundAndBack = async () => {
    await act(async () => focusManager.setFocused(false));
    await act(async () => focusManager.setFocused(true));
  };

  const freshClient = () => {
    const wrapper = createQueryWrapper();
    wrapper.client.setDefaultOptions({
      queries: { retry: false, gcTime: Infinity, staleTime: 60_000 },
    });
    return wrapper;
  };

  it.each<[string, string, () => UseQueryResult<unknown>]>([
    ['i seguiti', 'get_following', () => useFollowing()],
    ['le richieste ricevute', 'get_follow_requests', () => useFollowRequests()],
    ['il contatore richieste', 'count_follow_requests', () => useFollowRequestsCount()],
  ])('%s', async (_label, rpc, useHook) => {
    setFakeRpc({ [rpc]: rpc.startsWith('count') ? 0 : [] });
    const { Wrapper } = freshClient();
    await renderHook(useHook, { wrapper: Wrapper });
    await waitFor(() => expect(rpcCalls(rpc)).toHaveLength(1));
    await backgroundAndBack();
    await waitFor(() => expect(rpcCalls(rpc)).toHaveLength(2));
  });

  it('la ricerca utenti già aperta', async () => {
    jest.useFakeTimers();
    setFakeRpc({ search_users: [] });
    const { Wrapper } = freshClient();
    await renderHook(() => useUserSearch('volpe'), { wrapper: Wrapper });
    await act(async () => jest.advanceTimersByTime(400));
    await waitFor(() => expect(rpcCalls('search_users')).toHaveLength(1));
    await backgroundAndBack();
    await waitFor(() => expect(rpcCalls('search_users')).toHaveLength(2));
    jest.useRealTimers();
  });
});

describe('richiesta di follow dal composer della chat', () => {
  it('ricarica seguiti, ricerca, mappa amici, feed e storie', async () => {
    setFakeRpc({
      search_users: [
        {
          user_id: 'u1',
          handle: 'volpe.viola',
          age_band: '18-24',
          gender: 'female',
          is_creator: false,
          follow_state: 'none',
          follows_me: false,
          tonight_venue_id: null,
          tonight_venue_name: null,
        },
      ],
    });
    const { Wrapper, client } = createQueryWrapper();
    const invalidated = spyOnInvalidations(client);
    const { result } = await renderHook(() => useFollowByHandle(), { wrapper: Wrapper });
    await act(async () => result.current.follow('volpe.viola'));
    await waitFor(() => expect(result.current.requested).toEqual(['volpe.viola']));
    await waitFor(() =>
      expect(invalidated()).toEqual(
        expect.arrayContaining([FOLLOWING_KEY, ['userSearch'], ...FOLLOW_DEPENDENTS]),
      ),
    );
  });
});
