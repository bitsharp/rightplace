import type { ProfileSummary } from './api';

// Mine, or a person whose follow I had accepted by them (server rule, mirrored here only to choose what to draw):
// counters and posts are visible. Anyone else shows the public identity and a lock.
export function isProfileOpen(summary: Pick<ProfileSummary, 'isMe' | 'followState'>): boolean {
  return summary.isMe || summary.followState === 'accepted';
}
