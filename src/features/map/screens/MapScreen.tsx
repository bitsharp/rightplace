import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/app/TopBar';
import { TourAnchor } from '@/features/tour/components/TourAnchor';
import { TourOverlay } from '@/features/tour/components/TourOverlay';
import { SpotSheet } from '@/features/spots/components/SpotSheet';
import { colors, spacing } from '@/theme/tokens';

import { FriendsSheet } from '../components/FriendsSheet';
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
      <TourAnchor id="map.viewToggle" style={styles.controls}>
        <MapViewSwitch view={map.view} onChange={map.setView} />
      </TourAnchor>
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
        onOpenFriends={map.openFriends}
        onOpenEvent={map.openEvent}
        onPickSpot={map.pickSpot}
        avatarUrls={avatarUrls}
        header={<MapHeader cityName={map.city?.name ?? null} />}
        onOpenSearch={map.openSearch}
        onEnableLocation={map.openLocationSettings}
        busiestFocus={map.busiestFocus}
        highlight={map.highlight}
      />
      <MapBottomPanel
        view={map.view}
        loaded={map.loaded}
        loadFailed={map.loadFailed}
        friendVenues={map.layers.friendVenues}
        avatarUrls={avatarUrls}
        featured={map.featured}
        you={map.you}
        sponsored={map.sponsored}
        recommended={map.recommended}
        busiest={map.busiest}
        declaration={map.declaration}
        onOpenVenue={map.openVenue}
        onOpenFriend={map.openFriend}
        onSelectBusiest={map.selectBusiest}
      />
      <FriendsSheet
        venue={map.friendsSheetVenue}
        onClose={map.closeFriendsSheet}
        onOpenFriend={map.openFriend}
        onOpenVenue={map.openVenue}
      />
      <SpotSheet point={map.spotPoint} onClose={map.closeSpot} />
      <TourOverlay screen="map" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  controls: { paddingHorizontal: spacing.xl, paddingBottom: spacing.sm + 2 },
});
