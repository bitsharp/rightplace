import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { formatDistanceKm } from '@/features/map/domain/distance';
import { googleMapsPlaceUrl, isGooglePlaceId } from '@/features/venues/domain/googleMaps';
import { openLink } from '@/lib/links/links';
import { colors, heights, radius, spacing } from '@/theme/tokens';

import type { VenueDetail } from '../api';
import type { OpenStatus } from '../domain/openingHours';
import { OpenStatusLine } from './OpenStatusLine';

type Props = {
  detail: VenueDetail;
  status: OpenStatus | null;
  // Rounded to 500 m, only with the location toggle on (principle 3): null otherwise.
  distanceKm: number | null;
};

export function VenueHeader({ detail, status, distanceKm }: Props) {
  const { t } = useTranslation('venue');
  return (
    <View style={styles.block}>
      <Text accessibilityRole="header" variant="display30">
        {detail.name}
      </Text>
      <MetaLine detail={detail} distanceKm={distanceKm} />
      <OpenStatusLine status={status} />
      <View testID="venue-kind-chip" style={styles.chip}>
        <Text variant="label10" color="textSecondary">
          {t(`venues:kind.${detail.kind}`)}
        </Text>
      </View>
      {isGooglePlaceId(detail.googlePlaceId) ? <GoogleLines detail={detail} /> : null}
    </View>
  );
}

// Address (Places data, so only for Google places) and, when known, the distance from my coarse cell.
function MetaLine({ detail, distanceKm }: Pick<Props, 'detail' | 'distanceKm'>) {
  const { t, i18n } = useTranslation('venue');
  const address = isGooglePlaceId(detail.googlePlaceId) ? detail.address : null;
  const distance =
    distanceKm === null ? null : t('distance', { km: formatDistanceKm(distanceKm, i18n.language) });
  const line = [address, distance].filter(Boolean).join(' · ');
  if (!line) return null;
  return (
    <Text variant="body13" color="textSecondary">
      {line}
    </Text>
  );
}

// Places data must carry the Google attribution and a link back to Google Maps (docs/places-terms.md).
function GoogleLines({ detail }: { detail: VenueDetail }) {
  const { t } = useTranslation('venues');
  return (
    <View style={styles.google}>
      <MonoLabel>{t('googleAttribution')}</MonoLabel>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t('openInGoogleMaps')}
        onPress={() =>
          void openLink(googleMapsPlaceUrl({ ...detail, placeId: detail.googlePlaceId }))
        }
        style={styles.link}
      >
        <Text variant="body13Medium" color="going">
          {t('openInGoogleMaps')}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  google: { gap: spacing.xs },
  link: { minHeight: heights.minTapTarget, justifyContent: 'center' },
});
