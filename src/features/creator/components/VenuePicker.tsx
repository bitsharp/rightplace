import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { SearchField } from '@/components/ui/SearchField';
import { Text } from '@/components/ui/Text';
import { filterVenues, type CityVenue } from '@/features/venues/domain/venueList';
import { colors, heights, radius, spacing } from '@/theme/tokens';

type Props = {
  venues: readonly CityVenue[];
  value: string | null;
  onChange: (venueId: string | null) => void;
  error?: string;
  // Editing: the venue of a published event never changes.
  locked?: boolean;
};

const MAX_RESULTS = 6;

// "Luogo" (CreaSerata.dc.html): search the city's venues from the catalog (no per-user data involved).
export function VenuePicker({ venues, value, onChange, error, locked = false }: Props) {
  const { t } = useTranslation('creator');
  const selected = venues.find((venue) => venue.id === value);
  return (
    <View style={styles.block}>
      <Text variant="body13Medium" color="textSecondary">
        {t('form.venue.label')}
      </Text>
      {selected ? (
        <SelectedVenue venue={selected} locked={locked} onChange={() => onChange(null)} />
      ) : (
        <VenueSearch venues={venues} onPick={onChange} />
      )}
      {error ? (
        <Text variant="body13" color="error">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

function SelectedVenue({
  venue,
  locked,
  onChange,
}: {
  venue: CityVenue;
  locked: boolean;
  onChange: () => void;
}) {
  const { t } = useTranslation('creator');
  return (
    <Card tone="maybe" style={styles.selected}>
      <View style={styles.texts}>
        <Text variant="body15Strong">{venue.name}</Text>
        <Text variant="body12" color="textSecondary">
          {locked
            ? t('form.venue.locked')
            : `${t(`venues:kind.${venue.kind}`)} · ${venue.cityName}`}
        </Text>
      </View>
      {locked ? null : (
        <Button label={t('form.venue.change')} variant="ghost" size="md" onPress={onChange} />
      )}
    </Card>
  );
}

function VenueSearch({
  venues,
  onPick,
}: {
  venues: readonly CityVenue[];
  onPick: (id: string) => void;
}) {
  const { t } = useTranslation('creator');
  const [query, setQuery] = useState('');
  const matches = filterVenues(venues, { kind: null, query }).slice(0, MAX_RESULTS);
  return (
    <View style={styles.search}>
      <SearchField
        label={t('form.venue.searchLabel')}
        placeholder={t('form.venue.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
      />
      {matches.map((venue) => (
        <Pressable
          key={venue.id}
          accessibilityRole="button"
          accessibilityLabel={venue.name}
          onPress={() => onPick(venue.id)}
          style={styles.option}
        >
          <Text variant="body15Strong">{venue.name}</Text>
          <Text variant="body12" color="textSecondary">
            {`${t(`venues:kind.${venue.kind}`)} · ${venue.cityName}`}
          </Text>
        </Pressable>
      ))}
      {matches.length === 0 ? (
        <Text variant="body13" color="textSecondary">
          {t('form.venue.empty')}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  search: { gap: spacing.sm },
  selected: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  texts: { flex: 1, gap: 3 },
  option: {
    minHeight: heights.minTapTarget,
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});
