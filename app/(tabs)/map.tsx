import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { PlaceholderScreen } from '@/components/ui/PlaceholderScreen';
import { Text } from '@/components/ui/Text';
import { colors, heights, radius, spacing } from '@/theme/tokens';

// Placeholder until the map arrives (prompt 07); the search entry point is already the real one.
export default function MapScreen() {
  const { t } = useTranslation('map');
  const router = useRouter();
  return (
    <PlaceholderScreen title={t('title')}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('searchPlaceholder')}
        onPress={() => router.push('/search')}
        style={styles.search}
      >
        <Icon name="search" color="textSecondary" />
        <Text color="textSecondary">{t('searchPlaceholder')}</Text>
      </Pressable>
    </PlaceholderScreen>
  );
}

const styles = StyleSheet.create({
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    gap: spacing.sm + 2,
    height: heights.search,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
