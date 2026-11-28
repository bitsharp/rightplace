import { useEffect } from 'react';
import { AppState } from 'react-native';

import { setActiveTracker } from './activeTracker';
import { endUsageSession, startUsageSession, touchUsageSession } from './api';
import { createUsageTracker } from './domain/tracker';

const warn = (message: string, error: unknown) => console.warn(message, error);

// Mounted once while a user is signed in: one session per foreground period, touched every 60 s, closed when the
// app goes to the background (or before sign-out). Records nothing but time, platform and version.
export function useUsageTracking(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const tracker = createUsageTracker(
      { start: startUsageSession, touch: touchUsageSession, end: endUsageSession },
      warn,
    );
    setActiveTracker(tracker);
    const apply = (state: string | null | undefined) =>
      void (state === 'active' ? tracker.foreground() : tracker.background());
    apply(AppState.currentState);
    const subscription = AppState.addEventListener('change', apply);
    return () => {
      subscription.remove();
      setActiveTracker(null);
      void tracker.background();
    };
  }, [enabled]);
}
