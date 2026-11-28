import { useRouter } from 'expo-router';
import { useCallback } from 'react';

// A friend's face or @handle on a venue or night page opens their (private-account) profile.
export function useOpenFriend() {
  const router = useRouter();
  return useCallback(
    (handle: string) => router.push({ pathname: '/u/[handle]', params: { handle } }),
    [router],
  );
}
