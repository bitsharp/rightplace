import type { ProfileSummary } from './api';
import { isProfileOpen } from './profileOpen';

const summary = (overrides: Partial<ProfileSummary> = {}): ProfileSummary => ({
  handle: 'volpe.viola',
  ageBand: '25-34',
  gender: 'female',
  isCreator: false,
  followersCount: null,
  followingCount: null,
  postsCount: null,
  isMe: false,
  followState: 'none',
  ...overrides,
});

describe('isProfileOpen', () => {
  it('uno sconosciuto o una richiesta in attesa non aprono il profilo', () => {
    expect(isProfileOpen(summary())).toBe(false);
    expect(isProfileOpen(summary({ followState: 'pending' }))).toBe(false);
  });

  it('il mio profilo e quello di chi ho accettato come seguito sono aperti, anche con zero post', () => {
    expect(isProfileOpen(summary({ isMe: true, postsCount: 0 }))).toBe(true);
    expect(isProfileOpen(summary({ followState: 'accepted', postsCount: 0 }))).toBe(true);
  });
});
