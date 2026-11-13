import { useRouter, type Href } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { routeForNotification } from './domain/deepLink';

type Response = Notifications.NotificationResponse;

// A response can reach us twice (cold-start read + listener): each notification routes once.
const handled = new Set<string>();

function urlOf(response: Response): string | undefined {
  const data: unknown = response.notification.request.content.data;
  const url =
    typeof data === 'object' && data !== null ? (data as { url?: unknown }).url : undefined;
  return typeof url === 'string' ? url : undefined;
}

// Tap on a notification from a closed app, the background or the foreground: always the right screen.
// Enabled only once the session is ready, so a protected route is never pushed before sign-in.
export function useNotificationRouting(enabled: boolean): void {
  const router = useRouter();
  useEffect(() => {
    if (!enabled) return;
    const open = (response: Response | null) => {
      if (response === null) return;
      const id = response.notification.request.identifier;
      if (handled.has(id)) return;
      handled.add(id);
      // routeForNotification only returns known routes
      router.push(routeForNotification(urlOf(response)) as Href);
    };
    void Notifications.getLastNotificationResponseAsync().then(open);
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [enabled, router]);
}
