import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { requestFollow, searchUsers } from '@/features/friends/api';
import { FOLLOWING_KEY, USER_SEARCH_KEY } from '@/features/friends/keys';
import { RpcError } from '@/lib/rpcError';

// The follow request for a handle typed in the composer: the handle is resolved with the same search
// the Friends tab uses (public identity only), then a normal request is sent (principle 6: the other
// person still has to accept before anything is shared).
export function useFollowByHandle() {
  const queryClient = useQueryClient();
  const [requested, setRequested] = useState<string[]>([]);
  const mutation = useMutation({
    mutationFn: async (handle: string) => {
      const found = (await searchUsers(handle)).find((person) => person.handle === handle);
      if (!found) throw new RpcError('NOT_FOUND');
      if (found.followState === 'none') await requestFollow(found.userId);
    },
    onSuccess: (_result, handle) => setRequested((list) => [...list, handle]),
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: USER_SEARCH_KEY });
      await queryClient.invalidateQueries({ queryKey: FOLLOWING_KEY });
    },
  });
  return { requested, follow: (handle: string) => mutation.mutate(handle) };
}
