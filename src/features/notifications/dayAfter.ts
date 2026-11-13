import { nightDateOf } from './domain/reminders';
import { cancelDayAfterReminder } from './scheduler';
import { useNotificationStore } from './store/notificationStore';

type Input = {
  // From get_post_target; null for a creator's event
  nightDate: string | null;
  declarationExpiresAt: string | null;
  timezone: string;
};

// A post was published: "How was last night?" is no longer needed. The night is remembered so the
// declarative reminder sync does not plan it again while the declaration is still around.
export function stopDayAfterReminder({ nightDate, declarationExpiresAt, timezone }: Input): void {
  const night =
    nightDate ??
    (declarationExpiresAt ? nightDateOf(new Date(declarationExpiresAt), timezone) : null);
  if (night === null) return;
  useNotificationStore.getState().markNightPosted(night);
  void cancelDayAfterReminder(night).catch(() => console.warn('day-after cancel failed'));
}
