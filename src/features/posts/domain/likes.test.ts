import { applyLike } from './likes';
import type { FeedPost } from './types';

const post = (overrides: Partial<FeedPost> = {}): FeedPost => ({
  id: 'p1',
  authorId: 'u1',
  authorHandle: 'volpe.viola',
  venueName: 'Arena Club',
  nightDate: '2026-11-08',
  caption: null,
  hasPhoto: false,
  visibleFrom: '2026-11-09T05:00:00Z',
  expiresAt: '2026-11-16T05:00:00Z',
  likeCount: 2,
  commentCount: 0,
  likedByMe: false,
  isMine: false,
  ...overrides,
});

describe('applyLike', () => {
  it('mettere il like aggiunge uno al contatore', () => {
    expect(applyLike(post(), true)).toMatchObject({ likeCount: 3, likedByMe: true });
  });

  it('toglierlo ne sottrae uno', () => {
    expect(applyLike(post({ likedByMe: true }), false)).toMatchObject({
      likeCount: 1,
      likedByMe: false,
    });
  });

  it('è idempotente: ripetere lo stesso stato non cambia il contatore', () => {
    const liked = post({ likedByMe: true });
    expect(applyLike(liked, true)).toBe(liked);
  });

  it('il contatore non scende mai sotto zero', () => {
    expect(applyLike(post({ likedByMe: true, likeCount: 0 }), false).likeCount).toBe(0);
  });
});
