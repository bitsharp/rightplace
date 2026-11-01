import * as Haptics from 'expo-haptics';

// Haptics are a nicety: devices without a vibration motor reject, and that must never break the tap.
function ignoreUnsupported(promise: Promise<void>): void {
  promise.catch(() => undefined);
}

export function selectionFeedback(): void {
  ignoreUnsupported(Haptics.selectionAsync());
}

export function confirmFeedback(): void {
  ignoreUnsupported(Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}
