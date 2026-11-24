import { useRouter } from 'expo-router';
import { useState } from 'react';

import { dmErrorOf, type DmError } from './api';
import { useOpenDmThread } from './hooks';

// "Messaggio" on a profile: ask the server for the thread (it checks the friendship) and open it.
export function useStartDm() {
  const router = useRouter();
  const open = useOpenDmThread();
  const [error, setError] = useState<DmError | null>(null);
  const start = (person: { handle: string; userId: string }) => {
    setError(null);
    open.mutate(person.handle, {
      onSuccess: (threadId) =>
        router.push({
          pathname: '/dm/[threadId]',
          params: { threadId, handle: person.handle, userId: person.userId },
        }),
      onError: (failure) => setError(dmErrorOf(failure)),
    });
  };
  return { start, error, isPending: open.isPending };
}
