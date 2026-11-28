import type { UsageTracker } from './domain/tracker';

let active: UsageTracker | null = null;

export function setActiveTracker(tracker: UsageTracker | null): void {
  active = tracker;
}

// Called before sign-out: once the session is gone the server can no longer tell whose usage session to close.
export async function endActiveUsageSession(): Promise<void> {
  await active?.background();
}
