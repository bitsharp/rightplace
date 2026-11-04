import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { VenueRow } from '@/components/app/VenueRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Screen } from '@/components/ui/Screen';
import { SearchField } from '@/components/ui/SearchField';
import { Text } from '@/components/ui/Text';
import { colors, heights, spacing } from '@/theme/tokens';

import { RecentChips } from '../components/RecentChips';
import { SearchFilters } from '../components/SearchFilters';
import { useVenueSearch } from '../useVenueSearch';

export function SearchScreen() {
  const { t } = useTranslation('venues');
  const search = useVenueSearch();
  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('back')}
          onPress={search.goBack}
          style={styles.back}
        >
          <Icon name="chevronLeft" />
        </Pressable>
        <View style={styles.field}>
          <SearchField
            label={t('searchLabel')}
            placeholder={t('searchPlaceholder')}
            value={search.query}
            onChangeText={search.setQuery}
          />
        </View>
      </View>
      <SearchFilters
        cities={search.cities}
        citySlug={search.citySlug}
        onCity={search.setCitySlug}
        kind={search.kind}
        onKind={search.setKind}
      />
      <RecentChips recents={search.recents} onOpen={search.openVenue} />
      <Text variant="body13" color="textSecondary">
        {t('count', { count: search.rows.length })}
      </Text>
      <View style={styles.list}>
        {search.rows.map((row) => (
          <VenueRow
            key={row.id}
            name={row.name}
            meta={`${t(`kind.${row.kind}`)} · ${row.cityName}`}
            goingBand={row.goingBand}
            maybeBand={row.maybeBand}
            sponsored={row.isSponsored}
            onPress={() => search.openVenue(row.id)}
          />
        ))}
        {search.rows.length === 0 ? (
          <EmptyState message={search.loadFailed ? t('loadError') : t('empty')} />
        ) : null}
      </View>
      <MonoLabel>{t('googleAttribution')}</MonoLabel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: {
    width: heights.buttonMedium,
    height: heights.buttonMedium,
    borderRadius: heights.buttonMedium / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  field: { flex: 1 },
  list: { gap: spacing.sm + 2 },
});
