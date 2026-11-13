import { useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

import { FOLLOW_REQUESTS_ROOT_KEY, FOLLOWING_KEY, invalidateKeys, USER_SEARCH_KEY } from './keys';

// What the Friends tab shows depends on other people's phones (accepted requests, new requests),
// and tabs stay mounted: each time the tab comes back to the front, reload instead of showing the
// copy from the last visit. The map of friends is reloaded too because it follows the same people.
const FRIENDS_TAB_KEYS = [
  FOLLOWING_KEY,
  FOLLOW_REQUESTS_ROOT_KEY,
  USER_SEARCH_KEY,
  ['cityMap'],
] as const;

export function useRefreshOnTabFocus(): void {
  const queryClient = useQueryClient();
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      // The first focus is the mount itself: the queries are already loading, do not restart them.
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      void invalidateKeys(queryClient, FRIENDS_TAB_KEYS);
    }, [queryClient]),
  );
}
