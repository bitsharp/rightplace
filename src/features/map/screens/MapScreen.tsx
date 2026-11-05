import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TopBar } from '@/components/app/TopBar';
import { colors, spacing } from '@/theme/tokens';

import { MapBottomPanel } from '../components/MapBottomPanel';
import { MapSearchEntry } from '../components/MapSearchEntry';
import { MapStage } from '../components/MapStage';
import { MapViewSwitch } from '../components/MapViewSwitch';
import { useMapScreen } from '../useMapScreen';

export function MapScreen() {
  const map = useMapScreen();
  const { topBar } = map;
  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <TopBar {...topBar} />
      <View style={styles.controls}>
        <MapSearchEntry onPress={map.openSearch} />
        <MapViewSwitch view={map.view} onChange={map.setView} />
      </View>
      <MapStage
        city={map.city}
        layers={map.layers}
        view={map.view}
        you={map.you}
        onChangeView={map.setView}
        onOpenVenue={map.openVenue}
      />
      <MapBottomPanel
        view={map.view}
        loaded={map.loaded}
        loadFailed={map.loadFailed}
        banner={map.banner}
        friendVenues={map.layers.friendVenues}
        sponsored={map.sponsored}
        recommended={map.recommended}
        declaration={map.declaration}
        onOpenVenue={map.openVenue}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  controls: { gap: spacing.sm + 2, paddingHorizontal: spacing.xl, paddingBottom: spacing.sm + 2 },
});
