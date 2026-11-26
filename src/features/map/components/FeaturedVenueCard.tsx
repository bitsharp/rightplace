import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { EstimateTag } from '@/components/app/EstimateTag';
import { VenueCoverImage } from '@/components/app/VenueCoverImage';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { useBandLabel } from '@/components/ui/useBandLabel';
import type { LatLng } from '@/features/profile/domain/coarsen';
import { colors, radius, spacing } from '@/theme/tokens';

import { formatDistanceKm, roundedDistanceKm } from '../domain/distance';
import type { HotSpotVenue } from '../domain/mapLayers';

type Props = {
  venue: HotSpotVenue;
  // Third-party cover photo (switchable server-side); null shows the kind illustration.
  photoUrl: string | null;
  // The ~500 m cell, only when the location toggle is on (principle 3).
  you: LatLng | null;
  onPress: (venueId: string) => void;
};

const PHOTO_SIZE = 72;

// "20–30 persone" or "pochi": the band as the server gave it, never an exact count (principle 2).
function useBandText() {
  const { t } = useTranslation('map');
  const bandLabel = useBandLabel();
  return (band: HotSpotVenue['goingBand']) =>
    band === 'pochi' ? bandLabel(band) : `${bandLabel(band)} ${t('ui:people')}`;
}

export function FeaturedVenueCard({ venue, photoUrl, you, onPress }: Props) {
  const { t, i18n } = useTranslation('map');
  const bandText = useBandText()(venue.goingBand);
  const km = you ? roundedDistanceKm(you, venue) : null;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t('card.a11y', { venue: venue.name, band: bandText })}
      onPress={() => onPress(venue.venueId)}
      style={styles.card}
    >
      <VenueCoverImage
        url={photoUrl}
        kind={venue.kind}
        photoTestID="featured-venue-photo"
        style={styles.photo}
      />
      <View style={styles.texts}>
        <Text variant="body15Strong" numberOfLines={1}>
          {venue.name}
        </Text>
        <View style={styles.meta}>
          <Icon name="friends" size={14} color="going" />
          <Text variant="body12" color="textSecondary">
            {bandText}
          </Text>
          {venue.isEstimate ? <EstimateTag /> : null}
          {km === null ? null : (
            <Text variant="body12" color="textSecondary">
              {t('card.distance', { km: formatDistanceKm(km, i18n.language) })}
            </Text>
          )}
        </View>
        <View style={styles.tag}>
          <Text variant="label10" color="textSecondary">
            {t(`venues:kind.${venue.kind}`)}
          </Text>
        </View>
      </View>
      <Icon name="chevronRight" color="textSecondary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + 2,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.goingBorder,
    backgroundColor: colors.surface,
  },
  photo: { width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: radius.button },
  texts: { flex: 1, minWidth: 0, gap: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.sm },
  tag: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
