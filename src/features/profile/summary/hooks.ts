import { useQuery } from '@tanstack/react-query';

import { fetchProfileSummary } from './api';
import { profileSummaryKey } from './keys';

// Counters of other people never persist to disk (they can change the moment a follow is removed).
export function useProfileSummary(userId: string | null | undefined) {
  return useQuery({
    queryKey: profileSummaryKey(userId ?? ''),
    queryFn: () => fetchProfileSummary(userId ?? ''),
    enabled: Boolean(userId),
    meta: { persist: false },
  });
}
