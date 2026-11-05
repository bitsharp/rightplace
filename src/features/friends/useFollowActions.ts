import type { FollowAction } from '@/components/app/FriendRow';
import type { RpcErrorCode } from '@/lib/rpcError';
import { RpcError } from '@/lib/rpcError';

import { useCancelFollowRequest, useRequestFollow, useUnfollow } from './hooks';

const codeOf = (error: unknown): RpcErrorCode | null =>
  error instanceof RpcError ? error.code : error ? 'UNKNOWN' : null;

// One entry point for the three-state follow button: request, withdraw, or stop following.
export function useFollowActions() {
  const request = useRequestFollow();
  const cancel = useCancelFollowRequest();
  const unfollow = useUnfollow();
  const run = (userId: string, action: FollowAction) => {
    if (action === 'request') request.mutate(userId);
    else if (action === 'cancel') cancel.mutate(userId);
    else unfollow.mutate(userId);
  };
  return { run, errorCode: codeOf(request.error ?? cancel.error ?? unfollow.error) };
}
