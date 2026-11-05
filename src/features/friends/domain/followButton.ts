export type FollowStatus = 'none' | 'pending' | 'accepted';

export type FollowButtonState = {
  action: 'request' | 'cancel' | 'unfollow';
  labelKey: string;
  a11yKey: string;
  showFollowsYou: boolean;
};

// Keys live in the `ui` namespace. "Following" means an accepted follow only (principle 6).
const BY_STATUS: Record<FollowStatus, Omit<FollowButtonState, 'showFollowsYou'>> = {
  none: { action: 'request', labelKey: 'follow.request', a11yKey: 'follow.a11yRequest' },
  pending: { action: 'cancel', labelKey: 'follow.requested', a11yKey: 'follow.a11yCancel' },
  accepted: { action: 'unfollow', labelKey: 'follow.following', a11yKey: 'follow.a11yUnfollow' },
};

export function followButtonState(status: FollowStatus, followsMe: boolean): FollowButtonState {
  return { ...BY_STATUS[status], showFollowsYou: followsMe && status === 'none' };
}
