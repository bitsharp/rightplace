import { act, renderHook } from '@testing-library/react-native';

import type { FriendVenue } from './domain/mapLayers';
import { useFriendTaps } from './useFriendTaps';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({ useRouter: () => ({ push: mockPush }) }));

const single: FriendVenue = {
  venueId: 'solo',
  name: 'Bar Uno',
  handles: ['volpe.viola'],
  friendIds: ['u-volpe'],
  count: 1,
};
const group: FriendVenue = {
  venueId: 'gruppo',
  name: 'Arena Club',
  handles: ['volpe.viola', 'orso.grigio'],
  friendIds: ['u-volpe', 'u-orso'],
  count: 2,
};

const setup = async () => {
  const openVenue = jest.fn();
  const view = await renderHook(() => useFriendTaps([single, group], openVenue));
  return { ...view, openVenue };
};

describe('useFriendTaps', () => {
  beforeEach(() => jest.clearAllMocks());

  it('un marker con un solo amico apre il suo profilo', async () => {
    const { result, openVenue } = await setup();
    await act(async () => result.current.openFriends('solo'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/u/[handle]',
      params: { handle: 'volpe.viola' },
    });
    expect(openVenue).not.toHaveBeenCalled();
  });

  it('marker e figlio che segnalano lo stesso tap aprono un solo profilo', async () => {
    const { result } = await setup();
    await act(async () => {
      result.current.openFriends('solo');
      result.current.openFriends('solo');
    });
    expect(mockPush).toHaveBeenCalledTimes(1);
  });

  it('un marker con più amici apre il foglio di quel locale, senza navigare', async () => {
    const { result } = await setup();
    await act(async () => result.current.openFriends('gruppo'));
    expect(result.current.sheetVenue).toEqual(group);
    expect(mockPush).not.toHaveBeenCalled();
    await act(async () => result.current.closeSheet());
    expect(result.current.sheetVenue).toBeNull();
  });

  it('un locale senza amici noti apre il locale', async () => {
    const { result, openVenue } = await setup();
    await act(async () => result.current.openFriends('altro'));
    expect(openVenue).toHaveBeenCalledWith('altro');
  });

  it('openProfile porta al profilo pubblico', async () => {
    const { result } = await setup();
    await act(async () => result.current.openProfile('orso.grigio'));
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/u/[handle]',
      params: { handle: 'orso.grigio' },
    });
  });
});
