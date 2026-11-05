import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';

import type { MapViewMode } from '../store/mapStore';

// Wraps on two lines inside its container: it must never run past the screen edge.
export function MapHint({ view }: { view: MapViewMode }) {
  const { t } = useTranslation('map');
  return (
    <View style={styles.box}>
      <Text variant="label10" color="textSecondary" numberOfLines={2} style={styles.text}>
        {t(`hint.${view}`)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md - 2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.overlay,
  },
  text: { textTransform: 'uppercase' },
});
