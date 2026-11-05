import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { afterModalDismiss } from '@/lib/afterModalDismiss';
import { colors, heights, radius, spacing } from '@/theme/tokens';

import type { MapLayers } from '../domain/mapLayers';
import type { MapRegion } from '../domain/region';
import type { MapViewMode } from '../store/mapStore';

import { MapCanvas, type MapCity } from './MapCanvas';
import { MapHint } from './MapHint';
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
  onOpenVenue: (venueId: string) => void;
};

type BarProps = Pick<Props, 'view' | 'onChangeView' | 'onClose'>;

function FullScreenBar({ view, onChangeView, onClose }: BarProps) {
  const { t } = useTranslation('map');
  const { top } = useSafeAreaInsets();
  return (
    <View testID="map-fullscreen-bar" style={[styles.bar, { paddingTop: top + spacing.sm }]}>
      <View style={styles.switch}>
        <MapViewSwitch view={view} onChange={onChangeView} />
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('fullscreen.close')}
        onPress={onClose}
        style={styles.close}
      >
        <Icon name="close" />
      </Pressable>
    </View>
  );
}

type ContentProps = Omit<Props, 'visible' | 'onOpenVenue'> & {
  onOpenVenue: (venueId: string) => void;
};

function FullScreenContent(props: ContentProps) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <FullScreenBar view={props.view} onChangeView={props.onChangeView} onClose={props.onClose} />
      <View testID="map-fullscreen-map" style={styles.map}>
        <MapCanvas
          city={props.city}
          layers={props.layers}
          view={props.view}
          you={props.you}
          initialRegion={props.initialRegion}
          onRegionChange={props.onRegionChange}
          onOpenVenue={props.onOpenVenue}
        />
        <View testID="map-hint-overlay" pointerEvents="none" style={styles.hint}>
          <MapHint view={props.view} />
        </View>
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

// The only place where hint and legend are drawn over the map.
export function MapFullScreen({ visible, onOpenVenue, ...content }: Props) {
  const { onClose } = content;
  const deferred = useMemo(
    () => afterModalDismiss<string>(Platform.OS, onOpenVenue),
    [onOpenVenue],
  );
  const openAfterClose = (venueId: string) => {
    onClose();
    deferred.request(venueId);
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
        <FullScreenContent {...content} onOpenVenue={openAfterClose} />
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
  close: {
    width: heights.minTapTarget,
    height: heights.minTapTarget,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  map: { flex: 1, backgroundColor: colors.mapCanvas },
  hint: { position: 'absolute', top: spacing.md, left: spacing.md, right: spacing.md },
  legend: { position: 'absolute', left: spacing.md, right: spacing.md },
});
