import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient } from '@tanstack/react-query';

export const PERSIST_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // Persisted entries are dropped on restore if gcTime is shorter than the persister maxAge.
      queries: { gcTime: PERSIST_MAX_AGE_MS, staleTime: 30 * 1000 },
    },
  });
}

export const queryPersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'rightplace.query-cache',
});
