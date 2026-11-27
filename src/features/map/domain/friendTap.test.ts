import { friendTapOf } from './friendTap';
import type { FriendVenue } from './mapLayers';

const venue = (overrides: Partial<FriendVenue>): FriendVenue => ({
  venueId: 'v1',
  name: 'Arena Club',
  handles: ['volpe.viola'],
  friendIds: ['u-volpe'],
  count: 1,
  ...overrides,
});

describe('friendTapOf', () => {
  it('con un solo amico porta al suo profilo', () => {
    expect(friendTapOf(venue({}))).toEqual({ kind: 'profile', handle: 'volpe.viola' });
  });

  it('con più amici apre il foglio', () => {
    const many = venue({ handles: ['a.a', 'b.b'], friendIds: ['ua', 'ub'], count: 2 });
    expect(friendTapOf(many)).toEqual({ kind: 'sheet' });
  });

  it('con un amico visibile ma altri nascosti dal limite apre il foglio', () => {
    expect(friendTapOf(venue({ count: 3 }))).toEqual({ kind: 'sheet' });
  });

  it('senza volti utilizzabili (server vecchio) o locale ignoto apre il locale', () => {
    expect(friendTapOf(venue({ friendIds: [] }))).toEqual({ kind: 'venue' });
    expect(friendTapOf(undefined)).toEqual({ kind: 'venue' });
  });
});
