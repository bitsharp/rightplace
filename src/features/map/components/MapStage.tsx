import { StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/theme/tokens';

import type { MapLayers } from '../domain/mapLayers';
import type { MapViewMode } from '../store/mapStore';

import { MapCanvas, type MapCity } from './MapCanvas';
import { MapHint } from './MapHint';
import { MapLegend } from './MapLegend';

type Props = {
  city: MapCity | null;
  layers: MapLayers;
  view: MapViewMode;
  you: { lat: number; lng: number } | null;
  onOpenVenue: (venueId: string) => void;
};

// The map with its two overlays: hint on top, legend at the bottom (Mappa.dc.html).
export function MapStage({ city, layers, view, you, onOpenVenue }: Props) {
  return (
    <View testID="map-box" style={styles.box}>
      {city ? (
        <MapCanvas
          key={city.slug}
          city={city}
          layers={layers}
          view={view}
          you={you}
          onOpenVenue={onOpenVenue}
        />
      ) : null}
      <View pointerEvents="none" style={styles.hint}>
        <MapHint view={view} />
      </View>
      <View pointerEvents="none" style={styles.legend}>
        <MapLegend />
      </View>
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
  hint: { position: 'absolute', left: spacing.md + 2, top: spacing.md },
  legend: { position: 'absolute', left: spacing.md + 2, bottom: spacing.md + 2 },
});
