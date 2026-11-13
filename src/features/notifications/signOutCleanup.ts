import { unregisterPushToken } from './api';
import { cancelAllLocalReminders } from './scheduler';
import { resetNotificationState, useNotificationStore } from './store/notificationStore';

// Signing out must never fail because of notifications, and logs never carry the token (it identifies a device).
async function bestEffort(step: string, run: () => Promise<void>): Promise<void> {
  try {
    await run();
  } catch (error) {
    console.warn(
      `sign-out cleanup: ${step} failed (${error instanceof Error ? error.name : 'unknown'})`,
    );
  }
}

// Shared phones: the next account on this device must not receive this user's pushes or reminders.
// Runs BEFORE the session is closed, because unregistering needs it.
export async function prepareForSignOut(): Promise<void> {
  const token = useNotificationStore.getState().pushToken;
  if (token !== null) await bestEffort('unregister', () => unregisterPushToken(token));
  await bestEffort('reminders', cancelAllLocalReminders);
  resetNotificationState();
}
