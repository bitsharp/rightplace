import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { VenueCoverImage } from '@/components/app/VenueCoverImage';
import { Text } from '@/components/ui/Text';
import { useBandLabel } from '@/components/ui/useBandLabel';
import { colors, radius, spacing } from '@/theme/tokens';

import type { BusiestVenue } from '../api';
import { weekdayName } from '../domain/busiest';
import { typicalLabelKey } from '../domain/typical';

type Props = {
  venues: readonly BusiestVenue[];
  onOpen: (venueId: string) => void;
  // Injected for tests; the card reads the clock itself otherwise.
  now?: Date;
  timeZone?: string;
};

function MiniCard({ venue, onOpen }: { venue: BusiestVenue; onOpen: (venueId: string) => void }) {
  const { t } = useTranslation('map');
  const bandLabel = useBandLabel();
  const level = t(`ui:typical.${typicalLabelKey(venue.typicalLevel)}`);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={venue.name}
      onPress={() => onOpen(venue.venueId)}
      style={styles.card}
    >
      <VenueCoverImage
        url={venue.photoUrl}
        kind={venue.kind}
        photoTestID="busiest-photo"
        style={styles.cover}
      />
      <View style={styles.texts}>
        <Text variant="body15Strong" numberOfLines={1}>
          {venue.name}
        </Text>
        {/* The two layers side by side, never added together (principle 11): grey "di solito", coloured "stasera". */}
        <Text variant="body12" color="textSecondary" numberOfLines={1}>
          {t('ui:typical.usually', { level })}
        </Text>
        <Text variant="label11" color="going" numberOfLines={1}>
          {t('cards.tonightBand', { band: bandLabel(venue.goingBand) })}
        </Text>
      </View>
    </Pressable>
  );
}

// "I più animati del {giorno}": the venues that are usually busiest now, under the general map.
// Hidden when the server lists none.
export function BusiestTonightCard({ venues, onOpen, now, timeZone }: Props) {
  const { t, i18n } = useTranslation('map');
  if (venues.length === 0) return null;
  const day = weekdayName(now ?? new Date(), i18n.language, timeZone);
  return (
    <View style={styles.block}>
      <Text variant="display17">{t('busiest.title', { day })}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {venues.map((venue) => (
          <MiniCard key={venue.venueId} venue={venue} onOpen={onOpen} />
        ))}
      </ScrollView>
    </View>
  );
}

const CARD_WIDTH = 168;

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  row: { gap: spacing.sm, paddingRight: spacing.lg },
  card: {
    width: CARD_WIDTH,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  cover: { width: '100%', height: 72 },
  texts: { gap: 3, padding: spacing.sm + 2 },
});
