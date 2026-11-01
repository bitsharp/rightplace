import { useQuery } from '@tanstack/react-query';

import { fetchMyProfile } from './api';

export const myProfileKey = (userId: string | undefined) => ['profile', 'me', userId] as const;

export function useMyProfile(userId: string | undefined) {
  return useQuery({
    queryKey: myProfileKey(userId),
    queryFn: () => fetchMyProfile(userId ?? ''),
    enabled: Boolean(userId),
    // birth date and consents stay in memory, never in the on-disk query cache
    meta: { persist: false },
  });
}
