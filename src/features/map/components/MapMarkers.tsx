import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { EventSpot } from '@/components/app/EventSpot';
import { DEFAULT_MAX_FACES, FriendFaces } from '@/components/app/FriendFaces';
import { HotSpot } from '@/components/app/HotSpot';
import { OwnSpot } from '@/components/app/OwnSpot';
import { SpotMarker } from '@/components/app/SpotMarker';
import { TypicalDot } from '@/components/app/TypicalDot';
import type { LatLng } from '@/features/profile/domain/coarsen';

import type { EventSpotPlacement } from '../domain/eventSpots';
import { friendFacesOf, type HotSpotVenue, type MapVenue } from '../domain/mapLayers';
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
  // Photos still downloading inside the marker: keep capturing until they are drawn (see usePhotoWait).
  waitingForPhotos?: boolean;
  anchor?: { x: number; y: number };
  onPress?: () => void;
  children: ReactNode;
};

// Time for layout and fonts to settle before the marker bitmap is frozen.
const FIRST_RENDER_MS = 250;

// The bitmap is frozen shortly after each content change: tracking all the time slows 30 markers.
export function MapMarker({
  coordinate,
  contentKey,
  waitingForPhotos = false,
  children,
  ...props
}: MarkerProps) {
  const [settledKey, setSettledKey] = useState<string | null>(null);
  useEffect(() => {
    const timer = setTimeout(() => setSettledKey(contentKey), FIRST_RENDER_MS);
    return () => clearTimeout(timer);
  }, [contentKey]);
  return (
    <Marker
      coordinate={{ latitude: coordinate.lat, longitude: coordinate.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={settledKey !== contentKey || waitingForPhotos}
      {...props}
    >
      {children}
    </Marker>
  );
}

const FACES_HEIGHT = 30;
const NO_URLS: AvatarUrls = {};

type AvatarUrls = Record<string, string>;

const facesOf = (venue: MapVenue) => friendFacesOf(venue.friendsGoing ?? [], venue.friendIds);

// A photo that never answers must not keep the marker tracking (30 markers slow the map): after this we
// freeze it with the initial.
export const PHOTO_WAIT_MS = 3000;

type FaceState = 'initial' | 'loading' | 'drawn';

// Photos are part of the marker bitmap. The bitmap is frozen shortly after a content change, but a photo
// arrives later (signed URL, then the download): without waiting, the marker keeps the initial for good.
function usePhotoWait(faces: readonly { userId: string }[], urls: AvatarUrls) {
  const [drawn, setDrawn] = useState<ReadonlySet<string>>(new Set());
  const [gaveUp, setGaveUp] = useState('');
  const withPhoto = faces.slice(0, DEFAULT_MAX_FACES).filter((face) => urls[face.userId]);
  const stateOf = (userId: string): FaceState =>
    !urls[userId] ? 'initial' : drawn.has(`${userId}|${urls[userId]}`) ? 'drawn' : 'loading';
  const pendingIds = withPhoto
    .filter((face) => stateOf(face.userId) === 'loading')
    .map((face) => `${face.userId}|${urls[face.userId]}`)
    .join(',');
  useEffect(() => {
    if (!pendingIds) return;
    const timer = setTimeout(() => setGaveUp(pendingIds), PHOTO_WAIT_MS);
    return () => clearTimeout(timer);
  }, [pendingIds]);
  const onFaceSettled = useCallback(
    (userId: string) => setDrawn((prev) => new Set(prev).add(`${userId}|${urls[userId]}`)),
    [urls],
  );
  // Part of contentKey: when a photo is drawn the bitmap is captured again.
  const key = faces
    .slice(0, DEFAULT_MAX_FACES)
    .map((face) => stateOf(face.userId)[0])
    .join('');
  return { waiting: pendingIds !== '' && gaveUp !== pendingIds, key, onFaceSettled };
}

type FaceMarkerProps = {
  venue: MapVenue;
  view: MapViewMode;
  urls: AvatarUrls;
  testID: string;
  contentKey: string;
  zIndex: number;
  onOpenVenue: (venueId: string) => void;
  children: ReactNode;
};

// A venue marker; on the friends map (principle 1: a photo is for accepted follows, the general map never
// draws one) it carries the faces of the friends going. The spacer above balances the faces below, so the
// marker stays centred on the venue.
function VenueMarker({
  venue,
  view,
  urls,
  contentKey,
  onOpenVenue,
  children,
  ...props
}: FaceMarkerProps) {
  const faces = view === 'friends' ? facesOf(venue) : [];
  const photos = usePhotoWait(faces, urls);
  return (
    <MapMarker
      contentKey={`${contentKey}:${photos.key}`}
      waitingForPhotos={photos.waiting}
      coordinate={venue}
      onPress={() => onOpenVenue(venue.venueId)}
      {...props}
    >
      {faces.length === 0 ? (
        children
      ) : (
        <View style={styles.stack}>
          <View style={styles.faces} />
          {children}
          <View style={styles.faces}>
            <FriendFaces friends={faces} urls={urls} onFaceSettled={photos.onFaceSettled} />
          </View>
        </View>
      )}
    </MapMarker>
  );
}

const styles = StyleSheet.create({
  stack: { alignItems: 'center' },
  faces: { height: FACES_HEIGHT, alignItems: 'center', justifyContent: 'center' },
});

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
  urls = NO_URLS,
  onOpenVenue,
}: {
  hotSpots: HotSpotVenue[];
  view: MapViewMode;
  urls?: AvatarUrls;
  onOpenVenue: (venueId: string) => void;
}) {
  return hotSpots.map((venue) => (
    <VenueMarker
      key={venue.venueId}
      venue={venue}
      view={view}
      urls={urls}
      contentKey={[
        venue.venueId,
        venue.goingBand,
        venue.maybeBand,
        view,
        venue.friendsCount ?? '',
      ].join(':')}
      testID={`marker-hot-${venue.venueId}`}
      zIndex={Z_INDEX.hotSpot}
      onOpenVenue={onOpenVenue}
    >
      <HotSpot
        venueName={venue.name}
        goingBand={venue.goingBand}
        maybeBand={venue.maybeBand}
        caption={friendsCaption(venue, view)}
        onPress={() => onOpenVenue(venue.venueId)}
      />
    </VenueMarker>
  ));
}

export function SpotMarkers({
  spots,
  view,
  urls = NO_URLS,
  onOpenVenue,
}: {
  spots: MapVenue[];
  view: MapViewMode;
  urls?: AvatarUrls;
  onOpenVenue: (venueId: string) => void;
}) {
  return spots.map((venue) => (
    <VenueMarker
      key={venue.venueId}
      venue={venue}
      view={view}
      urls={urls}
      contentKey={[venue.venueId, venue.name, view, venue.friendsCount ?? ''].join(':')}
      testID={`marker-spot-${venue.venueId}`}
      zIndex={Z_INDEX.spot}
      onOpenVenue={onOpenVenue}
    >
      <SpotMarker
        name={venue.name}
        caption={friendsCaption(venue, view)}
        onPress={() => onOpenVenue(venue.venueId)}
      />
    </VenueMarker>
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
