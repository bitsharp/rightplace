import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, heights, radius, spacing } from '@/theme/tokens';

type Props = {
  cityName: string | null;
  onPress: () => void;
  // The pin on the left: centre on me, or explain how to turn the location on. Never opens the search.
  onLocate: () => void;
};

// Bottom bar of the map (mock-up): a pin button on its own (go to my location) and the city, whose tap opens the
// search (prompt 06).
export function MapSearchEntry({ cityName, onPress, onLocate }: Props) {
  const { t } = useTranslation('map');
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('locate')}
        onPress={onLocate}
        style={styles.locate}
      >
        <Icon name="locate" color="going" />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('searchPlaceholder')}
        onPress={onPress}
        style={styles.field}
      >
        <Text variant="body15Strong" color={cityName ? 'text' : 'textSecondary'} numberOfLines={1}>
          {cityName ?? t('searchPlaceholder')}
        </Text>
      </Pressable>
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
    height: '100%',
    paddingRight: spacing.md + 2,
  },
  locate: {
    marginLeft: spacing.xs,
    width: heights.minTapTarget,
    height: heights.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
