import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { spacing } from '@/theme/tokens';

import type { ActiveCity } from '../api';
import { VENUE_KINDS, type VenueKind } from '../domain/venueList';

type Props = {
  cities: ActiveCity[];
  citySlug: string;
  onCity: (slug: string) => void;
  kind: VenueKind | null;
  onKind: (kind: VenueKind | null) => void;
};

// "Altro" is a valid kind in the data but not a filter in the mock-up.
const FILTER_KINDS = VENUE_KINDS.filter((kind) => kind !== 'other');

export function SearchFilters({ cities, citySlug, onCity, kind, onKind }: Props) {
  const { t } = useTranslation('venues');
  return (
    <View style={styles.group}>
      <MonoLabel>{t('city')}</MonoLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        {cities.map((city) => (
          <Chip
            key={city.slug}
            label={city.name}
            selected={city.slug === citySlug}
            onPress={() => onCity(city.slug)}
          />
        ))}
      </ScrollView>
      <MonoLabel>{t('kindTitle')}</MonoLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <Chip
          label={t('kind.all')}
          tone="maybe"
          selected={kind === null}
          onPress={() => onKind(null)}
        />
        {FILTER_KINDS.map((option) => (
          <Chip
            key={option}
            label={t(`kind.${option}`)}
            tone="maybe"
            selected={kind === option}
            onPress={() => onKind(option)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  chips: { gap: spacing.sm },
});
