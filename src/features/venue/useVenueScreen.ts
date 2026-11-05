import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useMyDeclaration } from '@/features/map/hooks';

import type { VenueDetail } from './api';
import { declarationFor } from './domain/declarationState';
import { closingTimeTonight } from './domain/openingHours';
import { openTransportLink } from './domain/openTransportLink';
import { statsView, type StatsSegment } from './domain/statsState';
import { buildTransportLinks, type TransportDirection } from './domain/transport';
import { useVenueDetail, useVenueStats } from './hooks';

function linksFor(venue: VenueDetail, direction: TransportDirection) {
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
  const detail = useVenueDetail(venueId);
  const [segment, setSegment] = useState<StatsSegment>('going');
  const stats = useVenueStats(venueId, segment);
  const mine = useMyDeclaration();
  const [direction, setDirection] = useState<TransportDirection>('there');
  const [sheetOpen, setSheetOpen] = useState(false);

  const venue = detail.data ?? null;
  const links = venue ? linksFor(venue, direction) : [];
  // While the next segment loads, the previous numbers must not pose as the new segment's.
  const current = stats.data && !stats.isPlaceholderData ? stats.data : null;

  return {
    venue,
    loadFailed: detail.isError,
    bands: stats.data ?? null,
    statsView: current ? statsView(current, segment) : null,
    friends: stats.data?.friends ?? [],
    segment,
    setSegment,
    direction,
    setDirection,
    links,
    openLink: (link: Parameters<typeof openTransportLink>[0]) => void openTransportLink(link),
    closingTime: venue ? closingTimeTonight(venue.openingHours, new Date(), venue.timezone) : null,
    declaration: declarationFor(mine.data ?? null, { kind: 'night', id: venueId }),
    sheetOpen,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
    goBack: () => (router.canGoBack() ? router.back() : router.replace('/map')),
  };
}
