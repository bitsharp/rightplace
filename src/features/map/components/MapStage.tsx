import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { colors } from '@/theme/tokens';

import type { EventSpotPlacement } from '../domain/eventSpots';
import type { MapLayers } from '../domain/mapLayers';
import type { OwnSpot } from '../domain/ownSpot';
import type { MapRegion } from '../domain/region';
import type { MapViewMode } from '../store/mapStore';
import type { HighlightTarget } from '../useBusiestFocus';

import { MapCanvas, type MapCity, type MapFocus } from './MapCanvas';
import { MapFullScreen } from './MapFullScreen';
import type { OwnIdentity } from './OwnMarker';
import { MapControls } from './MapControls';

type Props = {
  city: MapCity | null;
  layers: MapLayers;
  view: MapViewMode;
  you: { lat: number; lng: number } | null;
  onChangeView: (view: MapViewMode) => void;
  onOpenVenue: (venueId: string) => void;
  onOpenFriends?: (venueId: string) => void;
  events?: readonly EventSpotPlacement[];
  onOpenEvent?: (eventId: string) => void;
  ownSpot?: OwnSpot | null;
  me?: OwnIdentity | null;
  onPickSpot?: (point: { lat: number; lng: number }) => void;
  avatarUrls?: Record<string, string>;
  onOpenSearch: () => void;
  // Title drawn over the top of the compact map.
  header?: ReactNode;
  // Opens the existing location toggle (privacy settings) from the "location is off" notice.
  onEnableLocation?: () => void;
  // A tap on "I più animati": move the camera there and ring the venue before its detail opens.
  busiestFocus?: MapFocus;
  highlight?: HighlightTarget | null;
};

// Principle 3: the map never asks for a permission by itself. With the toggle on it recentres on the coarse cell;
// with it off it only points to the toggle.
function useLocate(
  you: { lat: number; lng: number } | null,
  setFocus: (focus: MapFocus) => void,
  onEnableLocation?: () => void,
) {
  const { t } = useTranslation('map');
  return () => {
    if (you) return setFocus({ point: you });
    Alert.alert(t('locateOff.title'), t('locateOff.body'), [
      { text: t('locateOff.cancel'), style: 'cancel' },
      { text: t('locateOff.enable'), onPress: onEnableLocation },
    ]);
  };
}

// Compact map: markers only and one icon button. Hint and legend live in full screen.
export function MapStage({
  city,
  layers,
  view,
  you,
  onChangeView,
  onOpenVenue,
  header,
  onOpenSearch,
  onEnableLocation,
  busiestFocus,
  highlight,
  ...eventProps
}: Props) {
  const [fullScreen, setFullScreen] = useState(false);
  const [focus, setFocus] = useState<MapFocus | undefined>(undefined);
  // Local framing only (never persisted), shared by both maps: whichever moved last wins.
  // Tied to its city: when the city changes the map goes back to the new city centre.
  const [framing, setFraming] = useState<{ slug: string; region: MapRegion } | null>(null);
  const region = framing && framing.slug === city?.slug ? framing.region : undefined;
  const setRegion = (next: MapRegion) => city && setFraming({ slug: city.slug, region: next });
  // A new request from the busiest cards replaces the current one (adjusted while rendering, no effect).
  const [seenBusiest, setSeenBusiest] = useState<MapFocus | undefined>(undefined);
  if (busiestFocus !== seenBusiest) {
    setSeenBusiest(busiestFocus);
    if (busiestFocus) setFocus(busiestFocus);
  }
  const locate = useLocate(you, setFocus, onEnableLocation);
  return (
    <View testID="map-box" style={styles.box}>
      {city ? (
        <>
          {/* Never two MapViews at once: the compact one is unmounted while full screen is open. */}
          {fullScreen ? null : (
            <MapCanvas
              key={city.slug}
              city={city}
              layers={layers}
              view={view}
              you={you}
              initialRegion={region}
              onRegionChange={setRegion}
              onOpenVenue={onOpenVenue}
              focus={focus}
              highlight={highlight}
              {...eventProps}
            />
          )}
          <MapFullScreen
            visible={fullScreen}
            city={city}
            layers={layers}
            view={view}
            you={you}
            initialRegion={region}
            onChangeView={onChangeView}
            onRegionChange={setRegion}
            onClose={() => setFullScreen(false)}
            onOpenSearch={onOpenSearch}
            onLocate={locate}
            focus={focus}
            onOpenVenue={onOpenVenue}
            {...eventProps}
          />
          <View pointerEvents="box-none" style={styles.top}>
            {header}
          </View>
          <MapControls
            onOpenFilters={onOpenSearch}
            onExpand={() => setFullScreen(true)}
            onLocate={locate}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    flex: 1,
    minHeight: 180,
    backgroundColor: colors.mapCanvas,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  top: { position: 'absolute', top: 0, left: 0, right: 0 },
});
