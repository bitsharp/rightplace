import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useSession } from '@/features/auth/useSession';
import { useMyChatRooms } from '@/features/chat/hooks';
import { roundedDistanceKm } from '@/features/map/domain/distance';
import { useMyDeclaration } from '@/features/map/hooks';
import { isGooglePlaceId } from '@/features/venues/domain/googleMaps';

import { useAvatarUrls } from '@/features/profile/avatar/hooks';
import { useCoarsePositionStore } from '@/features/profile/location';

import type { VenueDetail, VenueFriend } from './api';
import { declarationFor } from './domain/declarationState';
import { venueOpenStatus } from './domain/openingHours';
import { openTransportLink } from './domain/openTransportLink';
import { statsView, type StatsSegment } from './domain/statsState';
import { buildTransportLinks, type TransportDirection } from './domain/transport';
import { useRefreshVenueDetails, useVenueDetail, useVenueStats } from './hooks';

const NO_FRIENDS: VenueFriend[] = [];

export function linksFor(venue: VenueDetail, direction: TransportDirection) {
  return buildTransportLinks({
    direction,
    venue: {
      name: venue.name,
      lat: venue.lat,
      lng: venue.lng,
      googlePlaceId: venue.googlePlaceId,
    },
    city: { country: venue.country, taxiNumber: venue.taxiNumber },
  });
}

export function useVenueScreen(venueId: string) {
  const router = useRouter();
  const { profile } = useSession();
  // Only a user who turned the toggle on ever has a cell, and it is already ~500 m coarse (principle 3).
  const coarseCell = useCoarsePositionStore((state) => state.cell);
  const you = profile?.locationOptIn ? coarseCell : null;
  const detail = useVenueDetail(venueId);
  useRefreshVenueDetails(detail.data ?? null);
  const [segment, setSegment] = useState<StatsSegment>('going');
  const stats = useVenueStats(venueId, segment);
  const mine = useMyDeclaration();
  // Rooms listed are only those I belong to, i.e. where I declared: no room, no button.
  const chatRoom = useMyChatRooms().data?.find(
    (room) => room.venueId === venueId && room.eventId === null,
  );
  const [direction, setDirection] = useState<TransportDirection>('there');
  const [sheetOpen, setSheetOpen] = useState(false);

  const friends = stats.data?.friends ?? NO_FRIENDS;
  const avatarUrls = useAvatarUrls(friends.map((friend) => friend.userId));
  const venue = detail.data ?? null;
  const links = venue ? linksFor(venue, direction) : [];
  // While the next segment loads, the previous numbers must not pose as the new segment's.
  const current = stats.data && !stats.isPlaceholderData ? stats.data : null;

  return {
    venue,
    isSpot: venue?.kind === 'spot',
    // Only spots named by users carry UGC (their name): that is what can be reported.
    isUserSpot: venue ? venue.kind === 'spot' && !isGooglePlaceId(venue.googlePlaceId) : false,
    loadFailed: detail.isError,
    bands: stats.data ?? null,
    statsView: current ? statsView(current, segment) : null,
    friends,
    myHandle: profile?.handle ?? null,
    // One request for the people listed here; only the photos I may see come back.
    avatarUrls,
    segment,
    setSegment,
    direction,
    setDirection,
    links,
    openLink: (link: Parameters<typeof openTransportLink>[0]) => void openTransportLink(link),
    // Places data only: a spot's address is not ours to show (same rule as the header).
    shownAddress: venue && isGooglePlaceId(venue.googlePlaceId) ? venue.address : null,
    status: venue ? venueOpenStatus(venue.openingHours, new Date(), venue.timezone) : null,
    distanceKm: venue && you ? roundedDistanceKm(you, venue) : null,
    // The existing friends list (tab): where "Vedi tutti" goes.
    openFriends: () => router.push('/friends'),
    declaration: declarationFor(mine.data ?? null, { kind: 'night', id: venueId }),
    chatRoomId: chatRoom?.roomId ?? null,
    openChat: () =>
      chatRoom && router.push({ pathname: '/night/[id]/chat', params: { id: chatRoom.roomId } }),
    sheetOpen,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
    goBack: () => (router.canGoBack() ? router.back() : router.replace('/map')),
  };
}
