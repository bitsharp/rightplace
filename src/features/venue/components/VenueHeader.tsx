import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { googleMapsPlaceUrl } from '@/features/venues/domain/googleMaps';
import { heights, spacing } from '@/theme/tokens';

import type { VenueDetail } from '../api';

type Props = {
  detail: VenueDetail;
  closingTime: string | null;
};

export function VenueHeader({ detail, closingTime }: Props) {
  const { t } = useTranslation('venue');
  const kind = t(`venues:kind.${detail.kind}`);
  const typeLine = closingTime ? t('typeLine', { kind, time: closingTime }) : kind;
  return (
    <View style={styles.block}>
      <Text variant="display24">{detail.name}</Text>
      <Text variant="body14" color="maybe">
        {typeLine}
      </Text>
      <AddressLines address={detail.address} googlePlaceId={detail.googlePlaceId} />
    </View>
  );
}

type AddressProps = { address: string | null; googlePlaceId: string };

// Places data must carry the Google attribution and a link back to Google Maps (docs/places-terms.md).
function AddressLines({ address, googlePlaceId }: AddressProps) {
  const { t } = useTranslation('venues');
  return (
    <View style={styles.address}>
      {address ? (
        <Text variant="body13" color="textSecondary">
          {address}
        </Text>
      ) : null}
      <MonoLabel>{t('googleAttribution')}</MonoLabel>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t('openInGoogleMaps')}
        onPress={() => void Linking.openURL(googleMapsPlaceUrl(googlePlaceId))}
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
  address: { gap: spacing.xs },
  link: { minHeight: heights.minTapTarget, justifyContent: 'center' },
});
