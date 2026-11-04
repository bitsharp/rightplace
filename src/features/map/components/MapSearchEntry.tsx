import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, heights, radius, spacing } from '@/theme/tokens';

// Looks like the search field of the mock-up but opens the search screen (prompt 06).
export function MapSearchEntry({ onPress }: { onPress: () => void }) {
  const { t } = useTranslation('map');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('searchPlaceholder')}
      onPress={onPress}
      style={styles.field}
    >
      <Icon name="search" color="textSecondary" />
      <Text color="textSecondary">{t('searchPlaceholder')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    height: heights.search,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
