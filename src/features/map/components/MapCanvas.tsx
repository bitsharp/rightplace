import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import MapView from 'react-native-maps';

import { YouMarker } from '@/components/app/YouMarker';
import type { LatLng } from '@/features/profile/domain/coarsen';
import { SpotPressSurface } from '@/features/spots/components/SpotPressSurface';

import type { EventSpotPlacement } from '../domain/eventSpots';
import type { MapLayers } from '../domain/mapLayers';
import type { OwnSpot as OwnSpotData } from '../domain/ownSpot';
import { cityRegion, type CityCenter, type MapRegion } from '../domain/region';
import { mapAppearance } from '../mapStyle';
import type { MapViewMode } from '../store/mapStore';

import { MapVignette } from './MapVignette';
import {
  EventMarkers,
  HotSpotMarkers,
  MapMarker,
  OwnMarker,
  SpotMarkers,
  TypicalMarkers,
  Z_INDEX,
} from './MapMarkers';

export type MapCity = CityCenter & { slug: string; name: string };

type Props = {
  city: MapCity;
  layers: MapLayers;
  view: MapViewMode;
  // Already coarsened to ~500 m (principle 3); null when the location toggle is off.
  you: LatLng | null;
  // Overrides the city centre, e.g. to keep the framing when switching to full screen.
  initialRegion?: MapRegion;
  onRegionChange?: (region: MapRegion) => void;
  onOpenVenue: (venueId: string) => void;
  // Creators' nights tonight ("stasera" layer), already placed so they never overlap a hot spot.
  events?: readonly EventSpotPlacement[];
  onOpenEvent?: (eventId: string) => void;
  // My own declaration tonight, drawn whatever the turnout ("stasera" layer); null when I have none.
  ownSpot?: OwnSpotData | null;
  // A 3 s press on the map picked this point: the caller opens the "serata in questo punto" sheet.
  onPickSpot?: (point: LatLng) => void;
  // Signed photos of the friends on the friends map (one batch per screen); never used on the general map.
  avatarUrls?: Record<string, string>;
  focus?: MapFocus;
};

// A request to centre on a point (the coarse "Tu" cell). The object itself is the request: a new object
// asks again for the same point, a re-render with the same object does not fight the user's panning.
export type MapFocus = { point: LatLng };

const FOCUS_DELTA = 0.02;
const FOCUS_MS = 400;

const NO_EVENTS: readonly EventSpotPlacement[] = [];

export function MapCanvas({
  city,
  layers,
  view,
  you,
  initialRegion,
  onRegionChange,
  onOpenVenue,
  events = NO_EVENTS,
  onOpenEvent,
  ownSpot = null,
  onPickSpot,
  avatarUrls,
  focus,
}: Props) {
  const { t } = useTranslation('map');
  const mapRef = useRef<MapView>(null);
  useEffect(() => {
    if (!focus) return;
    mapRef.current?.animateToRegion(
      {
        latitude: focus.point.lat,
        longitude: focus.point.lng,
        latitudeDelta: FOCUS_DELTA,
        longitudeDelta: FOCUS_DELTA,
      },
      FOCUS_MS,
    );
  }, [focus]);
  const map = (
    <MapView
      ref={mapRef}
      style={styles.map}
      accessibilityLabel={t('mapA11y', { city: city.name })}
      initialRegion={initialRegion ?? cityRegion(city)}
      onRegionChangeComplete={onRegionChange}
      showsUserLocation={false}
      showsPointsOfInterests={false}
      showsTraffic={false}
      toolbarEnabled={false}
      {...mapAppearance}
    >
      <TypicalMarkers dots={layers.typicalDots} onOpenVenue={onOpenVenue} />
      <SpotMarkers spots={layers.spots} view={view} urls={avatarUrls} onOpenVenue={onOpenVenue} />
      <EventMarkers events={events} onOpenEvent={onOpenEvent} />
      <HotSpotMarkers
        hotSpots={layers.hotSpots}
        view={view}
        urls={avatarUrls}
        onOpenVenue={onOpenVenue}
      />
      {ownSpot ? <OwnMarker spot={ownSpot} onOpenVenue={onOpenVenue} /> : null}
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
  return (
    <View style={styles.canvas}>
      {onPickSpot ? (
        <SpotPressSurface mapRef={mapRef} onPick={onPickSpot}>
          {map}
        </SpotPressSurface>
      ) : (
        map
      )}
      <MapVignette />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: StyleSheet.absoluteFill,
  map: StyleSheet.absoluteFill,
});
