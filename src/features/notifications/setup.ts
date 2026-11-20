import {
  AndroidImportance,
  setNotificationChannelAsync,
  setNotificationHandler,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { shouldPresentInForeground } from './domain/foreground';

export const ANDROID_CHANNELS = [
  'promemoria',
  'amici',
  'chat',
  'feed',
  'creator',
  'supporto',
] as const;
export type AndroidChannelId = (typeof ANDROID_CHANNELS)[number];

function notificationUrl(data: unknown): string | undefined {
  if (typeof data !== 'object' || data === null) return undefined;
  const url = (data as { url?: unknown }).url;
  return typeof url === 'string' ? url : undefined;
}

// Banners and sounds also with the app open, except when the user already looks at the destination.
// The path is read when the notification arrives, so it is always the current screen.
export function configureForegroundBehavior(getCurrentPath: () => string): void {
  setNotificationHandler({
    handleNotification: async (notification) => {
      const show = shouldPresentInForeground(
        notificationUrl(notification.request.content.data),
        getCurrentPath(),
      );
      return {
        shouldShowBanner: show,
        shouldShowList: show,
        shouldPlaySound: show,
        shouldSetBadge: false,
      };
    },
  });
}

export async function ensureAndroidChannels(
  names: Record<AndroidChannelId, string>,
): Promise<void> {
  if (Platform.OS !== 'android') return;
  for (const id of ANDROID_CHANNELS) {
    await setNotificationChannelAsync(id, {
      name: names[id],
      importance: AndroidImportance.DEFAULT,
    });
  }
}
