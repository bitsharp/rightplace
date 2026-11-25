import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/app/TopBar';
import { SpotSheet } from '@/features/spots/components/SpotSheet';
import { colors, spacing } from '@/theme/tokens';

import { MapBottomPanel } from '../components/MapBottomPanel';
import { MapHeader } from '../components/MapHeader';
import { MapStage } from '../components/MapStage';
import { MapViewSwitch } from '../components/MapViewSwitch';
import { useMapScreen } from '../useMapScreen';

export function MapScreen() {
  const map = useMapScreen();
  const { avatarUrls, ...topBar } = map.topBar;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <TopBar {...topBar} />
      <View style={styles.controls}>
        <MapViewSwitch view={map.view} onChange={map.setView} />
      </View>
      <MapStage
        city={map.city}
        layers={map.layers}
        events={map.eventSpots}
        ownSpot={map.ownSpot}
        me={map.me}
        view={map.view}
        you={map.you}
        onChangeView={map.setView}
        onOpenVenue={map.openVenue}
        onOpenEvent={map.openEvent}
        onPickSpot={map.pickSpot}
        avatarUrls={avatarUrls}
        header={<MapHeader cityName={map.city?.name ?? null} />}
        onOpenSearch={map.openSearch}
        onEnableLocation={map.openLocationSettings}
      />
      <MapBottomPanel
        view={map.view}
        loaded={map.loaded}
        loadFailed={map.loadFailed}
        banner={map.banner}
        friendVenues={map.layers.friendVenues}
        avatarUrls={avatarUrls}
        featured={map.featured}
        you={map.you}
        sponsored={map.sponsored}
        recommended={map.recommended}
        declaration={map.declaration}
        onOpenVenue={map.openVenue}
      />
      <SpotSheet point={map.spotPoint} onClose={map.closeSpot} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  controls: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm + 2 },
});
