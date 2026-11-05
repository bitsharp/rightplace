import { canPost } from './canPost';

describe('canPost', () => {
  it('si può postare solo se il server indica una serata recente', () => {
    expect(
      canPost({ nightId: 'n', eventId: null, venueName: 'Arena', nightDate: null, roomId: null }),
    ).toBe(true);
    expect(canPost(null)).toBe(false);
    expect(canPost(undefined)).toBe(false);
  });
});
