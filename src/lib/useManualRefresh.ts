import { useCallback, useState } from 'react';

// Drives a pull-to-refresh spinner from the user's own gesture only. Tying it to a query's `isRefetching` made
// every background refetch (window focus, invalidation after a post) flip the native iOS RefreshControl on, which
// can leave it stuck above the list; here it is on exactly while a manual reload is in flight.
export function useManualRefresh(reload: () => Promise<unknown>) {
  const [isRefreshing, setRefreshing] = useState(false);
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await reload();
    } finally {
      setRefreshing(false);
    }
  }, [reload]);
  return { isRefreshing, refresh };
}
