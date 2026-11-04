import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { colors, spacing } from '@/theme/tokens';

import type { MapViewMode } from '../store/mapStore';

export function MapHint({ view }: { view: MapViewMode }) {
  const { t } = useTranslation('map');
  return (
    <View style={styles.box}>
      <MonoLabel>{t(`hint.${view}`)}</MonoLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md - 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.overlay,
  },
});
