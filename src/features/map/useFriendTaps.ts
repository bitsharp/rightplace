import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { friendTapOf } from './domain/friendTap';
import type { FriendVenue } from './domain/mapLayers';

// Marker and child both report a tap on some devices: one navigation per friend is enough.
const DOUBLE_TAP_MS = 600;

// Taps on friends in the friends view (principle 6: only accepted follows are ever in these rows).
export function useFriendTaps(
  friendVenues: readonly FriendVenue[],
  openVenue: (venueId: string) => void,
) {
  const router = useRouter();
  const last = useRef({ handle: '', at: 0 });
  const [sheetVenueId, setSheetVenueId] = useState<string | null>(null);

  const openProfile = useCallback(
    (handle: string) => {
      const now = Date.now();
      if (last.current.handle === handle && now - last.current.at < DOUBLE_TAP_MS) return;
      last.current = { handle, at: now };
      router.push({ pathname: '/u/[handle]', params: { handle } });
    },
    [router],
  );

  const openFriends = useCallback(
    (venueId: string) => {
      const tap = friendTapOf(friendVenues.find((venue) => venue.venueId === venueId));
      if (tap.kind === 'profile') return openProfile(tap.handle);
      if (tap.kind === 'sheet') return setSheetVenueId(venueId);
      openVenue(venueId);
    },
    [friendVenues, openProfile, openVenue],
  );

  return {
    openFriends,
    openProfile,
    // Derived from the live rows: a refresh while the sheet is open updates it, a vanished venue closes it.
    sheetVenue: friendVenues.find((venue) => venue.venueId === sheetVenueId) ?? null,
    closeSheet: () => setSheetVenueId(null),
  };
}
