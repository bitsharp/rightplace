import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { RecommendedCard, SponsoredCard } from '@/components/app/PromoCard';
import { useBandLabel } from '@/components/ui/useBandLabel';
import { spacing } from '@/theme/tokens';

import type { MyDeclaration, RecommendedVenue } from '../api';
import type { MapVenue } from '../domain/mapLayers';
import { isVisibleTypical, typicalLabelKey } from '../domain/typical';

import { OwnNightCard } from './OwnNightCard';

type Props = {
  // My own declaration tonight: always first (it is mine, whatever the turnout).
  own: MyDeclaration | null;
  sponsored: MapVenue | null;
  recommended: RecommendedVenue | null;
  onOpen: (venueId: string) => void;
};

function useSponsoredMeta() {
  const { t } = useTranslation('map');
  const bandLabel = useBandLabel();
  return (venue: MapVenue): string => {
    const parts = [t(`venues:kind.${venue.kind}`)];
    // The two layers are described side by side and never added together (principle 11).
    if (isVisibleTypical(venue.typicalLevel)) {
      const level = t(`ui:typical.${typicalLabelKey(venue.typicalLevel)}`);
      parts.push(t('ui:typical.usually', { level }));
    }
    if (venue.isHotSpot && venue.goingBand !== null) {
      parts.push(t('cards.tonightBand', { band: bandLabel(venue.goingBand) }));
    }
    return parts.join(' · ');
  };
}

export function MapCards({ own, sponsored, recommended, onOpen }: Props) {
  const { t } = useTranslation('map');
  const sponsoredMeta = useSponsoredMeta();
  if (!own && !sponsored && !recommended) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.cards}
    >
      {own ? (
        <View style={styles.slot}>
          <OwnNightCard declaration={own} onPress={onOpen} />
        </View>
      ) : null}
      {sponsored ? (
        <View style={styles.slot}>
          <SponsoredCard
            name={sponsored.name}
            meta={sponsoredMeta(sponsored)}
            onPress={() => onOpen(sponsored.venueId)}
          />
        </View>
      ) : null}
      {recommended ? (
        <View style={styles.slot}>
          <RecommendedCard
            name={recommended.name}
            meta={t(`cards.${recommended.reason}`)}
            onPress={() => onOpen(recommended.venueId)}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

const CARD_WIDTH = 288;

const styles = StyleSheet.create({
  cards: { gap: spacing.sm, paddingRight: spacing.lg },
  slot: { width: CARD_WIDTH },
});
