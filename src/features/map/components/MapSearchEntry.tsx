import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, heights, radius, spacing } from '@/theme/tokens';

type Props = {
  cityName: string | null;
  onPress: () => void;
  // Only passed when the location toggle is on: the map never asks for a permission by itself.
  onLocate?: () => void;
};

// Bottom bar of the map (mock-up): the city, a tap opens the search (prompt 06); the arrow recentres on me.
export function MapSearchEntry({ cityName, onPress, onLocate }: Props) {
  const { t } = useTranslation('map');
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('searchPlaceholder')}
        onPress={onPress}
        style={styles.field}
      >
        <Icon name="map" color="going" />
        <Text variant="body15Strong" color={cityName ? 'text' : 'textSecondary'} numberOfLines={1}>
          {cityName ?? t('searchPlaceholder')}
        </Text>
      </Pressable>
      {onLocate ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('locate')}
          onPress={onLocate}
          style={styles.locate}
        >
          <Icon name="locate" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: heights.search,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.overlay,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    height: '100%',
    paddingHorizontal: spacing.md + 2,
  },
  locate: {
    width: heights.minTapTarget,
    height: heights.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
