import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { create } from 'zustand';

import { useReminderSync } from './hooks';
import { usePrePermissionStore } from './prePermission';
import { registerDevicePushToken } from './pushToken';
import { configureForegroundBehavior, ensureAndroidChannels } from './setup';
import { useNotificationRouting } from './useNotificationRouting';

// Where the user is right now, so a banner for the screen already open is skipped. Not persisted.
export const useCurrentPath = create<{ path: string; setPath: (path: string) => void }>((set) => ({
  path: '/',
  setPath: (path) => set({ path }),
}));

// Everything notifications need once the user is signed in with a complete profile: the foreground
// behaviour, Android channels, device registration, reminder planning and tap routing.
export function useNotificationRuntime(ready: boolean): void {
  const { t, i18n } = useTranslation('notifications');
  const pathname = usePathname();
  const permissionVersion = usePrePermissionStore((state) => state.permissionVersion);

  useEffect(() => useCurrentPath.getState().setPath(pathname), [pathname]);
  useEffect(() => configureForegroundBehavior(() => useCurrentPath.getState().path), []);
  useEffect(() => {
    void ensureAndroidChannels({
      promemoria: t('channels.promemoria'),
      amici: t('channels.amici'),
      chat: t('channels.chat'),
      feed: t('channels.feed'),
      creator: t('channels.creator'),
    }).catch(() => console.warn('android channels failed'));
  }, [t, i18n.language]);
  useEffect(() => {
    if (ready) void registerDevicePushToken();
  }, [ready, permissionVersion]);

  useNotificationRouting(ready);
  useReminderSync(ready);
}
