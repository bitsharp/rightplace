import { routeForNotification } from './deepLink';

// With the app open a banner is welcome, unless the user is already looking at where it would lead.
export function shouldPresentInForeground(
  notificationUrl: string | null | undefined,
  currentPath: string,
): boolean {
  if (!notificationUrl) return true;
  return routeForNotification(notificationUrl) !== currentPath;
}
