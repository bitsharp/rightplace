import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { registerPushToken } from './api';
import { getPermissionStatus } from './permissions';
import { useNotificationStore } from './store/notificationStore';

export type RegistrationResult = 'registered' | 'no-permission' | 'unavailable';

const projectId = (): string | undefined => {
  const eas: unknown = Constants.expoConfig?.extra?.eas;
  const id =
    typeof eas === 'object' && eas !== null
      ? (eas as { projectId?: unknown }).projectId
      : undefined;
  return typeof id === 'string' ? id : undefined;
};

// Logged without the token: it identifies a device.
function reportUnavailable(reason: string): RegistrationResult {
  console.warn(`push token unavailable: ${reason}`);
  return 'unavailable';
}

// Safe to call at every launch (the server upserts). Never throws: push is optional, the app works without it
// (Expo Go on Android has no remote push at all).
export async function registerDevicePushToken(): Promise<RegistrationResult> {
  if ((await getPermissionStatus()) !== 'granted') return 'no-permission';
  const platform = Platform.OS;
  const id = projectId();
  if ((platform !== 'ios' && platform !== 'android') || id === undefined) {
    return reportUnavailable('missing platform or projectId');
  }
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    await registerPushToken(token, platform);
    useNotificationStore.getState().setPushToken(token);
    return 'registered';
  } catch (error) {
    return reportUnavailable(error instanceof Error ? error.name : 'unknown error');
  }
}
