import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { useMapStore, type MapViewMode } from '@/features/map/store/mapStore';
import { spacing } from '@/theme/tokens';

import { SettingsPage } from '../components/SettingsPage';

// "Mappa all'avvio": the preference only. The Mappe/Amici switch on the map keeps changing just the session.
export function MapViewScreen() {
  const { t } = useTranslation('profile');
  const { t: tMap } = useTranslation('map');
  const defaultView = useMapStore((state) => state.defaultView);
  const setDefaultView = useMapStore((state) => state.setDefaultView);
  const options: readonly { value: MapViewMode; label: string }[] = [
    { value: 'general', label: tMap('view.general') },
    { value: 'friends', label: tMap('view.friends') },
  ];
  return (
    <SettingsPage title={t('settings.rows.mapView')}>
      <View style={styles.field}>
        <SegmentedControl options={options} value={defaultView} onChange={setDefaultView} />
        <Text variant="body13" color="textSecondary">
          {t('mapView.hint')}
        </Text>
      </View>
    </SettingsPage>
  );
}

const styles = StyleSheet.create({ field: { gap: spacing.sm } });
