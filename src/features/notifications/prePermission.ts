import { Platform } from 'react-native';
import { create } from 'zustand';

import { afterModalDismiss, type AfterModalDismiss } from '@/lib/afterModalDismiss';

import { shouldAskPermission } from './domain/permissionAsk';
import { getPermissionStatus, requestNotificationPermission } from './permissions';
import { registerDevicePushToken } from './pushToken';
import { useNotificationStore } from './store/notificationStore';

type PromptState = {
  open: boolean;
  // Bumped when the user grants the permission, so reminders are planned right away.
  permissionVersion: number;
};

// UI-only (never persisted): whether our own "do you want notifications?" sheet is showing.
export const usePrePermissionStore = create<PromptState>(() => ({
  open: false,
  permissionVersion: 0,
}));

async function openIfNeeded(): Promise<void> {
  const status = await getPermissionStatus();
  const { permissionAskedAt } = useNotificationStore.getState();
  if (shouldAskPermission({ status, lastAskedAt: permissionAskedAt, now: Date.now() })) {
    usePrePermissionStore.setState({ open: true });
  }
}

let afterDeclaration: AfterModalDismiss<void> | null = null;

// The declaration sheet is a Modal: on iOS another one may only open after it is gone.
function scheduler(): AfterModalDismiss<void> {
  afterDeclaration ??= afterModalDismiss<void>(Platform.OS, () => void openIfNeeded());
  return afterDeclaration;
}

// Called after a declaration succeeded (the first one asks; later ones only if a week has passed).
export function requestPrePermission(): void {
  afterDeclaration = null;
  scheduler().request();
}

// Wired to the declaration Sheet's onDismiss.
export function onDeclarationSheetDismiss(): void {
  scheduler().onDismiss();
}

export function declinePrePermission(): void {
  useNotificationStore.getState().setPermissionAskedAt(Date.now());
  usePrePermissionStore.setState({ open: false });
}

export async function acceptPrePermission(): Promise<void> {
  useNotificationStore.getState().setPermissionAskedAt(Date.now());
  usePrePermissionStore.setState({ open: false });
  if ((await requestNotificationPermission()) !== 'granted') return;
  await registerDevicePushToken();
  usePrePermissionStore.setState((state) => ({ permissionVersion: state.permissionVersion + 1 }));
}
