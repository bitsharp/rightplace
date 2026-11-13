import type * as Notifications from 'expo-notifications';

type Permission = Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>;
type Response = Awaited<ReturnType<typeof Notifications.getLastNotificationResponseAsync>>;

// expo-notifications types `status` as an enum; the native module answers with these strings.
export function permissionResponse(
  status: 'granted' | 'denied' | 'undetermined',
  canAskAgain = true,
): Permission {
  return { status, granted: status === 'granted', canAskAgain, expires: 'never' } as Permission;
}

export function notificationResponse(url: string, identifier = 'n1'): NonNullable<Response> {
  return {
    actionIdentifier: 'expo.modules.notifications.actions.DEFAULT',
    notification: { request: { identifier, content: { data: { url } } } },
  } as unknown as NonNullable<Response>;
}
