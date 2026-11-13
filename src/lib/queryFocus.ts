import { focusManager } from '@tanstack/react-query';
import { AppState, type NativeEventSubscription } from 'react-native';

// React Native has no `visibilitychange`: without this, `refetchOnWindowFocus` never fires when the
// app returns from the background. Call once, where the QueryClient is created; returns the cleanup.
export function setupQueryFocus(): () => void {
  focusManager.setEventListener((setFocused) => {
    const subscription: NativeEventSubscription = AppState.addEventListener('change', (status) =>
      setFocused(status === 'active'),
    );
    return () => subscription.remove();
  });
  // Replacing the listener runs the previous cleanup, which removes the AppState subscription.
  return () => focusManager.setEventListener(() => undefined);
}
