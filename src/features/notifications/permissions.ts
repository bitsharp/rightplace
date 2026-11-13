import * as Notifications from 'expo-notifications';
import { Linking } from 'react-native';

import type { PermissionStatus } from './domain/permissionAsk';

type Response = Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>;

// Android can ask again after a first refusal: until it cannot, "denied" still counts as "not decided".
function toStatus(response: Response): PermissionStatus {
  if (response.granted) return 'granted';
  if (response.status === 'denied' && !response.canAskAgain) return 'denied';
  return 'undetermined';
}

export async function getPermissionStatus(): Promise<PermissionStatus> {
  return toStatus(await Notifications.getPermissionsAsync());
}

export async function requestNotificationPermission(): Promise<PermissionStatus> {
  return toStatus(await Notifications.requestPermissionsAsync());
}

// Once refused for good, only the system settings can turn notifications back on.
export function openSystemSettings(): Promise<void> {
  return Linking.openSettings();
}
