import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AgeStatCard } from '@/components/app/AgeStatCard';
import { FriendVenueRow } from '@/components/app/FriendVenueRow';
import { GenderBar } from '@/components/app/GenderBar';
import { HotSpot } from '@/components/app/HotSpot';
import { RecommendedCard, SponsoredCard } from '@/components/app/PromoCard';
import { VenueRow } from '@/components/app/VenueRow';
import { YouMarker } from '@/components/app/YouMarker';
import { Avatar } from '@/components/ui/Avatar';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { HandleText } from '@/components/ui/HandleText';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { RangeStat } from '@/components/ui/RangeStat';
import { Toast } from '@/components/ui/Toast';
import { colors, radius, spacing } from '@/theme/tokens';

import { SAMPLE_FRIENDS, SAMPLE_HANDLE, SAMPLE_ROOFTOP, SAMPLE_VENUE } from './samples';
import { Row, Section } from './Section';

const noop = () => undefined;

export function StatesSection() {
  const { t } = useTranslation('dev');
  return (
    <Section name="states">
      <Row>
        <MonoLabel tone="going">{t('sample.solelyDeclared')}</MonoLabel>
        <MonoLabel tone="maybe">{t('sample.solelyDeclared')}</MonoLabel>
      </Row>
      <View style={styles.pair}>
        <RangeStat intent="going" band="30–50" />
        <RangeStat intent="maybe" band="pochi" />
      </View>
      <AgeStatCard averageAge={24.3} />
      <GenderBar femalePct={52} malePct={48} />
      <EmptyState message={t('sample.fewerThanThree')} />
      <Toast tone="success" message={t('sample.toast')} />
      <Card tone="going">
        <Row>
          <Avatar intent="going" initial="V" />
          <Avatar intent="maybe" initial="G" />
          <Avatar intent="neutral" initial="L" size={52} />
          <HandleText handle={SAMPLE_HANDLE} />
        </Row>
      </Card>
    </Section>
  );
}

export function MapSection() {
  const { t } = useTranslation('dev');
  return (
    <Section name="map">
      <View style={styles.mapCanvas}>
        <HotSpot venueName={SAMPLE_VENUE} goingBand="50–100" maybeBand="30–50" onPress={noop} />
        <HotSpot venueName={SAMPLE_ROOFTOP} goingBand="pochi" maybeBand="20–30" onPress={noop} />
        <HotSpot venueName={SAMPLE_VENUE} goingBand="pochi" maybeBand="pochi" onPress={noop} />
        <HotSpot
          venueName={SAMPLE_VENUE}
          goingBand="pochi"
          maybeBand="pochi"
          caption="2"
          onPress={noop}
        />
        <YouMarker />
      </View>
      <SponsoredCard name={SAMPLE_VENUE} meta={t('sample.sponsoredMeta')} onPress={noop} />
      <RecommendedCard name={SAMPLE_ROOFTOP} meta={t('sample.recommendedMeta')} onPress={noop} />
      <VenueRow
        name={SAMPLE_VENUE}
        meta={t('sample.clubMeta')}
        goingBand="50–100"
        maybeBand="30–50"
        sponsored
        onPress={noop}
      />
      <VenueRow
        name={SAMPLE_ROOFTOP}
        meta={t('sample.clubMeta')}
        goingBand="20–30"
        maybeBand="pochi"
        onPress={noop}
      />
      <FriendVenueRow venueName={SAMPLE_VENUE} friendHandles={SAMPLE_FRIENDS} onPress={noop} />
    </Section>
  );
}

const styles = StyleSheet.create({
  pair: { flexDirection: 'row', gap: spacing.sm + 2 },
  mapCanvas: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-around',
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.mapCanvas,
  },
});
