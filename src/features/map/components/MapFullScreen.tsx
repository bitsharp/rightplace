import { Modal, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import type { LatLng } from '@/features/profile/domain/coarsen';
import { useAfterModalDismiss } from '@/lib/useAfterModalDismiss';
import { colors, spacing } from '@/theme/tokens';

import type { EventSpotPlacement } from '../domain/eventSpots';
import type { MapLayers } from '../domain/mapLayers';
import type { OwnSpot } from '../domain/ownSpot';
import type { OwnIdentity } from './OwnMarker';
import type { MapRegion } from '../domain/region';
import type { MapViewMode } from '../store/mapStore';

import { MapCanvas, type MapCity, type MapFocus } from './MapCanvas';
import { MapControls } from './MapControls';
import { MapLegend } from './MapLegend';
import { MapViewSwitch } from './MapViewSwitch';

type Props = {
  visible: boolean;
  city: MapCity;
  layers: MapLayers;
  view: MapViewMode;
  you: { lat: number; lng: number } | null;
  initialRegion: MapRegion | undefined;
  onChangeView: (view: MapViewMode) => void;
  onRegionChange: (region: MapRegion) => void;
  onClose: () => void;
  // Same three round buttons as the compact map: search, shrink (onClose) and locate.
  onOpenSearch: () => void;
  onLocate: () => void;
  focus?: MapFocus;
  onOpenVenue: (venueId: string) => void;
  events?: readonly EventSpotPlacement[];
  onOpenEvent?: (eventId: string) => void;
  ownSpot?: OwnSpot | null;
  me?: OwnIdentity | null;
  onPickSpot?: (point: LatLng) => void;
  avatarUrls?: Record<string, string>;
};

type BarProps = Pick<Props, 'view' | 'onChangeView'>;

function FullScreenBar({ view, onChangeView }: BarProps) {
  const { top } = useSafeAreaInsets();
  return (
    <View testID="map-fullscreen-bar" style={[styles.bar, { paddingTop: top + spacing.sm }]}>
      <View style={styles.switch}>
        <MapViewSwitch view={view} onChange={onChangeView} />
      </View>
    </View>
  );
}

type ContentProps = Omit<Props, 'visible'>;

function FullScreenContent(props: ContentProps) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <FullScreenBar view={props.view} onChangeView={props.onChangeView} />
      <View testID="map-fullscreen-map" style={styles.map}>
        <MapCanvas
          city={props.city}
          layers={props.layers}
          view={props.view}
          you={props.you}
          initialRegion={props.initialRegion}
          onRegionChange={props.onRegionChange}
          onOpenVenue={props.onOpenVenue}
          events={props.events}
          onOpenEvent={props.onOpenEvent}
          ownSpot={props.ownSpot}
          me={props.me}
          onPickSpot={props.onPickSpot}
          avatarUrls={props.avatarUrls}
          focus={props.focus}
        />
        <MapControls
          expanded
          onOpenFilters={props.onOpenSearch}
          onExpand={props.onClose}
          onLocate={props.onLocate}
        />
        <View
          testID="map-legend-overlay"
          pointerEvents="none"
          style={[styles.legend, { bottom: spacing.md + bottom }]}
        >
          <MapLegend />
        </View>
      </View>
    </View>
  );
}

type Destination =
  { kind: 'venue' | 'event'; id: string } | { kind: 'spot'; point: LatLng } | { kind: 'search' };

// The only place where the legend is drawn over the map.
export function MapFullScreen({
  visible,
  onOpenVenue,
  onOpenEvent,
  onPickSpot,
  onOpenSearch,
  ...content
}: Props) {
  const { onClose } = content;
  const deferred = useAfterModalDismiss<Destination>((destination) => {
    if (destination.kind === 'search') return onOpenSearch();
    if (destination.kind === 'spot') return onPickSpot?.(destination.point);
    if (destination.kind === 'venue') return onOpenVenue(destination.id);
    onOpenEvent?.(destination.id);
  });
  const openAfterClose = (kind: 'venue' | 'event') => (id: string) => {
    onClose();
    deferred.request({ kind, id });
  };
  // The sheet is another Modal: it opens only once this one is gone (iOS drops it otherwise).
  const pickAfterClose = (point: LatLng) => {
    onClose();
    deferred.request({ kind: 'spot', point });
  };
  // Search is a navigation: it waits for the Modal to be gone, like the venue.
  const searchAfterClose = () => {
    onClose();
    deferred.request({ kind: 'search' });
  };
  return (
    <Modal
      testID="map-fullscreen"
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
      onDismiss={deferred.onDismiss}
    >
      {/* A Modal is a separate native root: without its own provider the insets read as zero. */}
      <SafeAreaProvider>
        <FullScreenContent
          {...content}
          onOpenVenue={openAfterClose('venue')}
          onOpenEvent={openAfterClose('event')}
          onPickSpot={onPickSpot ? pickAfterClose : undefined}
          onOpenSearch={searchAfterClose}
        />
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  switch: { flex: 1 },
  map: { flex: 1, backgroundColor: colors.mapCanvas },
  legend: { position: 'absolute', left: spacing.md, right: spacing.md },
});
