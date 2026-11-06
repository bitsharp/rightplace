import { useRouter } from 'expo-router';
import { useState } from 'react';

import { useMyChatRooms } from '@/features/chat/hooks';
import { useMyDeclaration } from '@/features/map/hooks';
import { declarationFor } from '@/features/venue/domain/declarationState';
import type { VenueDetail } from '@/features/venue/api';
import { openTransportLink } from '@/features/venue/domain/openTransportLink';
import { statsView } from '@/features/venue/domain/statsState';
import type { TransportDirection } from '@/features/venue/domain/transport';
import { useVenueDetail } from '@/features/venue/hooks';
import { linksFor } from '@/features/venue/useVenueScreen';

import { useEventDetail } from './hooks';
import { useTargetLabel, useWhenLabel } from './useEventLabels';

// "Andare e tornare": the direction toggle and the deep links of the venue.
function useTransport(venue: VenueDetail | null) {
  const [direction, setDirection] = useState<TransportDirection>('there');
  return {
    direction,
    setDirection,
    links: venue ? linksFor(venue, direction) : [],
    openLink: (link: Parameters<typeof openTransportLink>[0]) => void openTransportLink(link),
  };
}

export function useEventScreen(eventId: string) {
  const router = useRouter();
  const detail = useEventDetail(eventId);
  const event = detail.data ?? null;
  // The venue catalog gives country, Google place and taxi number for "Andare e tornare".
  const venue = useVenueDetail(event?.venueId ?? '', event !== null).data ?? null;
  const mine = useMyDeclaration();
  const room = useMyChatRooms().data?.find((candidate) => candidate.eventId === eventId);
  const transport = useTransport(venue);
  const [sheetOpen, setSheetOpen] = useState(false);
  const whenLabel = useWhenLabel();
  const targetLabel = useTargetLabel();

  const cancelled = event?.cancelledAt != null;
  const ended = event !== null && new Date(event.endsAt) <= new Date();

  return {
    event,
    venue,
    loadFailed: detail.isError,
    cancelled,
    canDeclare: event !== null && !cancelled && !ended,
    whenLabel: event ? whenLabel(event.startsAt, event.endsAt, event.timezone) : '',
    targetLabel: event ? targetLabel(event.ageBands, event.genders) : '',
    // One group only: the event page has no Ci vado / Forse / Tutti segments.
    statsView: event ? statsView(event, 'all') : null,
    declaration: declarationFor(mine.data ?? null, { kind: 'event', id: eventId }),
    chatRoomId: room?.roomId ?? null,
    openChat: () =>
      room && router.push({ pathname: '/night/[id]/chat', params: { id: room.roomId } }),
    ...transport,
    openVenue: () =>
      event && router.push({ pathname: '/venue/[id]', params: { id: event.venueId } }),
    sheetOpen,
    openSheet: () => setSheetOpen(true),
    closeSheet: () => setSheetOpen(false),
    goBack: () => (router.canGoBack() ? router.back() : router.replace('/map')),
  };
}
