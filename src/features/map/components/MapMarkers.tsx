import { useEffect, useState, type ReactNode } from 'react';
import { Marker } from 'react-native-maps';

import { EventSpot } from '@/components/app/EventSpot';
import { HotSpot } from '@/components/app/HotSpot';
import { OwnSpot } from '@/components/app/OwnSpot';
import { SpotMarker } from '@/components/app/SpotMarker';
import { TypicalDot } from '@/components/app/TypicalDot';
import type { LatLng } from '@/features/profile/domain/coarsen';

import type { EventSpotPlacement } from '../domain/eventSpots';
import type { HotSpotVenue, MapVenue } from '../domain/mapLayers';
import type { OwnSpot as OwnSpotData } from '../domain/ownSpot';
import { isVisibleTypical } from '../domain/typical';
import type { MapViewMode } from '../store/mapStore';

// Grey "di solito" dots under the coloured "stasera" hot spots, "Tu" above everything.
export const Z_INDEX = { typical: 1, spot: 2, event: 3, hotSpot: 4, own: 5, you: 6 } as const;

type MarkerProps = {
  testID: string;
  // Describes what the marker draws: when it changes the bitmap must be captured again.
  contentKey: string;
  coordinate: LatLng;
  zIndex: number;
  anchor?: { x: number; y: number };
  onPress?: () => void;
  children: ReactNode;
};

// Time for layout and fonts to settle before the marker bitmap is frozen.
const FIRST_RENDER_MS = 250;

// The bitmap is frozen shortly after each content change: tracking all the time slows 30 markers.
export function MapMarker({ coordinate, contentKey, children, ...props }: MarkerProps) {
  const [settledKey, setSettledKey] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSettledKey(contentKey), FIRST_RENDER_MS);
    return () => clearTimeout(timer);
  }, [contentKey]);
  return (
    <Marker
      coordinate={{ latitude: coordinate.lat, longitude: coordinate.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={settledKey !== contentKey}
      {...props}
    >
      {children}
    </Marker>
  );
}

function friendsCaption(venue: MapVenue, view: MapViewMode): string | undefined {
  return view === 'friends' ? String(venue.friendsCount ?? 0) : undefined;
}

export function TypicalMarkers({
  dots,
  onOpenVenue,
}: {
  dots: MapVenue[];
  onOpenVenue: (venueId: string) => void;
}) {
  return dots.map((venue) =>
    isVisibleTypical(venue.typicalLevel) ? (
      <MapMarker
        key={venue.venueId}
        contentKey={`${venue.venueId}:${venue.typicalLevel}`}
        testID={`marker-typical-${venue.venueId}`}
        coordinate={venue}
        zIndex={Z_INDEX.typical}
        onPress={() => onOpenVenue(venue.venueId)}
      >
        <TypicalDot
          venueName={venue.name}
          level={venue.typicalLevel}
          onPress={() => onOpenVenue(venue.venueId)}
        />
      </MapMarker>
    ) : null,
  );
}

export function HotSpotMarkers({
  hotSpots,
  view,
  onOpenVenue,
}: {
  hotSpots: HotSpotVenue[];
  view: MapViewMode;
  onOpenVenue: (venueId: string) => void;
}) {
  return hotSpots.map((venue) => (
    <MapMarker
      key={venue.venueId}
      contentKey={[
        venue.venueId,
        venue.goingBand,
        venue.maybeBand,
        view,
        venue.friendsCount ?? '',
      ].join(':')}
      testID={`marker-hot-${venue.venueId}`}
      coordinate={venue}
      zIndex={Z_INDEX.hotSpot}
      onPress={() => onOpenVenue(venue.venueId)}
    >
      <HotSpot
        venueName={venue.name}
        goingBand={venue.goingBand}
        maybeBand={venue.maybeBand}
        caption={friendsCaption(venue, view)}
        onPress={() => onOpenVenue(venue.venueId)}
      />
    </MapMarker>
  ));
}

export function SpotMarkers({
  spots,
  view,
  onOpenVenue,
}: {
  spots: MapVenue[];
  view: MapViewMode;
  onOpenVenue: (venueId: string) => void;
}) {
  return spots.map((venue) => (
    <MapMarker
      key={venue.venueId}
      contentKey={[venue.venueId, venue.name, view, venue.friendsCount ?? ''].join(':')}
      testID={`marker-spot-${venue.venueId}`}
      coordinate={venue}
      zIndex={Z_INDEX.spot}
      onPress={() => onOpenVenue(venue.venueId)}
    >
      <SpotMarker
        name={venue.name}
        caption={friendsCaption(venue, view)}
        onPress={() => onOpenVenue(venue.venueId)}
      />
    </MapMarker>
  ));
}

export function EventMarkers({
  events,
  onOpenEvent,
}: {
  events: readonly EventSpotPlacement[];
  onOpenEvent?: (eventId: string) => void;
}) {
  return events.map(({ event, lat, lng }) => (
    <MapMarker
      key={event.eventId}
      contentKey={[event.eventId, event.goingBand, event.maybeBand].join(':')}
      testID={`marker-event-${event.eventId}`}
      coordinate={{ lat, lng }}
      zIndex={Z_INDEX.event}
      onPress={() => onOpenEvent?.(event.eventId)}
    >
      <EventSpot
        name={event.name}
        goingBand={event.goingBand}
        maybeBand={event.maybeBand}
        onPress={() => onOpenEvent?.(event.eventId)}
      />
    </MapMarker>
  ));
}

// The label sits just above the venue so it does not hide the hot spot circle under it.
const OWN_ANCHOR = { x: 0.5, y: 1 } as const;

export function OwnMarker({
  spot,
  onOpenVenue,
}: {
  spot: OwnSpotData;
  onOpenVenue: (venueId: string) => void;
}) {
  return (
    <MapMarker
      testID="marker-own"
      contentKey={`${spot.venueId}:${spot.intent}`}
      coordinate={spot}
      zIndex={Z_INDEX.own}
      anchor={OWN_ANCHOR}
      onPress={() => onOpenVenue(spot.venueId)}
    >
      <OwnSpot
        venueName={spot.name}
        intent={spot.intent}
        onPress={() => onOpenVenue(spot.venueId)}
      />
    </MapMarker>
  );
}
