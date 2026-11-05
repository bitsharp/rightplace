import {
  useMutation,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';

import { confirmFeedback, selectionFeedback } from '@/lib/haptics';

import {
  acceptFollow,
  blockUser,
  cancelFollowRequest,
  declineFollow,
  removeFollower,
  reportUser,
  requestFollow,
  unblockUser,
  unfollow,
  type FollowRequest,
  type SearchResult,
} from './api';
import type { FollowStatus } from './domain/followButton';
import {
  BLOCKED_KEY,
  FOLLOW_REQUESTS_COUNT_KEY,
  FOLLOW_REQUESTS_KEY,
  FOLLOW_REQUESTS_ROOT_KEY,
  FOLLOWERS_KEY,
  FOLLOWING_KEY,
  invalidateFollowDependents,
  invalidateKeys,
  USER_SEARCH_KEY,
} from './keys';

type Snapshot = [QueryKey, unknown][];

// Optimistic updates change only `followState` in search results: never the venue of tonight,
// which the server reveals only once the follow is accepted (principle 6).
async function setSearchFollowState(
  queryClient: QueryClient,
  userId: string,
  followState: FollowStatus,
): Promise<Snapshot> {
  await queryClient.cancelQueries({ queryKey: USER_SEARCH_KEY });
  const snapshot = queryClient.getQueriesData<SearchResult[]>({ queryKey: USER_SEARCH_KEY });
  queryClient.setQueriesData<SearchResult[]>({ queryKey: USER_SEARCH_KEY }, (rows) =>
    rows?.map((row) => (row.userId === userId ? { ...row, followState } : row)),
  );
  return snapshot;
}

function restore(queryClient: QueryClient, snapshot: Snapshot | undefined): void {
  snapshot?.forEach(([key, data]) => queryClient.setQueryData(key, data));
}

async function dropRequest(queryClient: QueryClient, userId: string): Promise<Snapshot> {
  await queryClient.cancelQueries({ queryKey: FOLLOW_REQUESTS_ROOT_KEY });
  const snapshot: Snapshot = [
    [FOLLOW_REQUESTS_KEY, queryClient.getQueryData(FOLLOW_REQUESTS_KEY)],
    [FOLLOW_REQUESTS_COUNT_KEY, queryClient.getQueryData(FOLLOW_REQUESTS_COUNT_KEY)],
  ];
  queryClient.setQueryData<FollowRequest[]>(FOLLOW_REQUESTS_KEY, (rows) =>
    rows?.filter((row) => row.userId !== userId),
  );
  queryClient.setQueryData<number>(FOLLOW_REQUESTS_COUNT_KEY, (count) =>
    count === undefined ? count : Math.max(0, count - 1),
  );
  return snapshot;
}

function useSearchFollowMutation(
  mutationFn: (userId: string) => Promise<void>,
  nextState: FollowStatus,
  feedback: () => void,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: (userId: string) => {
      feedback();
      return setSearchFollowState(queryClient, userId, nextState);
    },
    onError: (_error, _userId, snapshot) => restore(queryClient, snapshot),
    onSettled: () => invalidateKeys(queryClient, [USER_SEARCH_KEY, FOLLOWING_KEY]),
  });
}

export const useRequestFollow = () =>
  useSearchFollowMutation(requestFollow, 'pending', confirmFeedback);
export const useCancelFollowRequest = () =>
  useSearchFollowMutation(cancelFollowRequest, 'none', selectionFeedback);

function useRequestAnswer(
  mutationFn: (userId: string) => Promise<void>,
  feedback: () => void,
  alsoInvalidate: readonly (readonly unknown[])[],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onMutate: (userId: string) => {
      feedback();
      return dropRequest(queryClient, userId);
    },
    onError: (_error, _userId, snapshot) => restore(queryClient, snapshot),
    onSettled: () =>
      invalidateKeys(queryClient, [FOLLOW_REQUESTS_ROOT_KEY, USER_SEARCH_KEY, ...alsoInvalidate]),
  });
}

export const useAcceptFollow = () =>
  useRequestAnswer(acceptFollow, confirmFeedback, [FOLLOWERS_KEY]);
export const useDeclineFollow = () => useRequestAnswer(declineFollow, selectionFeedback, []);

function useInvalidatingMutation(
  mutationFn: (userId: string) => Promise<void>,
  keys: readonly (readonly unknown[])[],
  refreshFollowDependents: boolean,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSettled: async () => {
      await invalidateKeys(queryClient, [USER_SEARCH_KEY, ...keys]);
      if (refreshFollowDependents) await invalidateFollowDependents(queryClient);
    },
  });
}

export const useUnfollow = () => useInvalidatingMutation(unfollow, [FOLLOWING_KEY], true);
export const useRemoveFollower = () =>
  useInvalidatingMutation(removeFollower, [FOLLOWERS_KEY], true);
export const useUnblockUser = () => useInvalidatingMutation(unblockUser, [BLOCKED_KEY], false);
export const useBlockUser = () =>
  useInvalidatingMutation(
    blockUser,
    [FOLLOWING_KEY, FOLLOWERS_KEY, FOLLOW_REQUESTS_ROOT_KEY, BLOCKED_KEY],
    true,
  );

export function useReportUser() {
  return useMutation({ mutationFn: (userId: string) => reportUser(userId) });
}
