import { useSyncExternalStore } from 'react';

import { useTourStore } from './store/tourStore';

const subscribe = (notify: () => void) => useTourStore.persist.onFinishHydration(notify);
const hasHydrated = () => useTourStore.persist.hasHydrated();

// The saved state loads asynchronously: until then "welcome not seen" is only the default, and
// acting on it would flash the welcome at users who already saw it.
export function useTourHydrated(): boolean {
  return useSyncExternalStore(subscribe, hasHydrated, hasHydrated);
}
