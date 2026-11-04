import { useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { HotSpot } from '@/components/app/HotSpot';
import { TypicalDot } from '@/components/app/TypicalDot';
import { YouMarker } from '@/components/app/YouMarker';
import type { LatLng } from '@/features/profile/domain/coarsen';

import { isVisibleTypical } from '../domain/typical';
import type { MapLayers, MapVenue } from '../domain/mapLayers';
import { cityRegion, type CityCenter } from '../domain/region';
import { mapAppearance } from '../mapStyle';
import type { MapViewMode } from '../store/mapStore';

export type MapCity = CityCenter & { slug: string; name: string };

type Props = {
  city: MapCity;
  layers: MapLayers;
  view: MapViewMode;
  // Already coarsened to ~500 m (principle 3); null when the location toggle is off.
  you: LatLng | null;
  onOpenVenue: (venueId: string) => void;
};

// Grey "di solito" dots under the coloured "stasera" hot spots, "Tu" above everything.
const Z_INDEX = { typical: 1, hotSpot: 2, you: 3 } as const;

type MarkerProps = {
  testID: string;
  // Describes what the marker draws: when it changes the bitmap must be captured again.
  contentKey: string;
  coordinate: LatLng;
  zIndex: number;
  onPress?: () => void;
  children: ReactNode;
};

// Time for layout and fonts to settle before the marker bitmap is frozen.
const FIRST_RENDER_MS = 250;

// The bitmap is frozen shortly after each content change: tracking all the time slows 30 markers.
function MapMarker({ coordinate, contentKey, children, ...props }: MarkerProps) {
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

function hotSpotCaption(venue: MapVenue, view: MapViewMode): string | undefined {
  return view === 'friends' ? String(venue.friendsCount ?? 0) : undefined;
}

function TypicalMarkers({
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

function HotSpotMarkers({
  hotSpots,
  view,
  onOpenVenue,
}: {
  hotSpots: MapVenue[];
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
        caption={hotSpotCaption(venue, view)}
        onPress={() => onOpenVenue(venue.venueId)}
      />
    </MapMarker>
  ));
}

export function MapCanvas({ city, layers, view, you, onOpenVenue }: Props) {
  const { t } = useTranslation('map');
  return (
    <MapView
      style={styles.map}
      accessibilityLabel={t('mapA11y', { city: city.name })}
      initialRegion={cityRegion(city)}
      showsUserLocation={false}
      showsPointsOfInterests={false}
      showsTraffic={false}
      toolbarEnabled={false}
      {...mapAppearance}
    >
      <TypicalMarkers dots={layers.typicalDots} onOpenVenue={onOpenVenue} />
      <HotSpotMarkers hotSpots={layers.hotSpots} view={view} onOpenVenue={onOpenVenue} />
      {you ? (
        <MapMarker
          testID="marker-you"
          contentKey={`${you.lat}:${you.lng}`}
          coordinate={you}
          zIndex={Z_INDEX.you}
        >
          <YouMarker />
        </MapMarker>
      ) : null}
    </MapView>
  );
}

const styles = StyleSheet.create({ map: StyleSheet.absoluteFill });
