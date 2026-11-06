import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { colors, heights, radius, spacing } from '@/theme/tokens';

import type { EventSpotPlacement } from '../domain/eventSpots';
import type { MapLayers } from '../domain/mapLayers';
import type { MapRegion } from '../domain/region';
import type { MapViewMode } from '../store/mapStore';

import { MapCanvas, type MapCity } from './MapCanvas';
import { MapFullScreen } from './MapFullScreen';

type Props = {
  city: MapCity | null;
  layers: MapLayers;
  view: MapViewMode;
  you: { lat: number; lng: number } | null;
  onChangeView: (view: MapViewMode) => void;
  onOpenVenue: (venueId: string) => void;
  events?: readonly EventSpotPlacement[];
  onOpenEvent?: (eventId: string) => void;
};

function ExpandButton({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation('map');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('fullscreen.open')}
      onPress={onPress}
      style={styles.expand}
    >
      <Icon name="expand" />
    </Pressable>
  );
}

// Compact map: markers only and one icon button. Hint and legend live in full screen.
export function MapStage({
  city,
  layers,
  view,
  you,
  onChangeView,
  onOpenVenue,
  ...eventProps
}: Props) {
  const [fullScreen, setFullScreen] = useState(false);
  // Local framing only (never persisted), shared by both maps: whichever moved last wins.
  const [region, setRegion] = useState<MapRegion | undefined>(undefined);
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
            onOpenVenue={onOpenVenue}
            {...eventProps}
          />
          <ExpandButton onPress={() => setFullScreen(true)} />
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
  expand: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: heights.minTapTarget,
    height: heights.minTapTarget,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
