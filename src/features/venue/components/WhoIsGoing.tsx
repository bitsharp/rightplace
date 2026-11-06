import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { AgeStatCard } from '@/components/app/AgeStatCard';
import { GenderBar } from '@/components/app/GenderBar';
import { EmptyState } from '@/components/ui/EmptyState';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { SegmentedControl, type SegmentOption } from '@/components/ui/SegmentedControl';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import type { StatsSegment, StatsView } from '../domain/statsState';

type Props = {
  segment: StatsSegment;
  onSegment: (segment: StatsSegment) => void;
  // null while the server answer is on its way: nothing is drawn, never a guess.
  view: StatsView | null;
};

const SEGMENTS: readonly { value: StatsSegment; tone: SegmentOption<StatsSegment>['tone'] }[] = [
  { value: 'going', tone: 'going' },
  { value: 'maybe', tone: 'maybe' },
  { value: 'all', tone: 'neutral' },
];

export function WhoIsGoing({ segment, onSegment, view }: Props) {
  const { t } = useTranslation('venue');
  const options = SEGMENTS.map(({ value, tone }) => ({
    value,
    tone,
    label: t(`who.segment.${value}`),
  }));
  return (
    <View style={styles.block}>
      <View style={styles.titleRow}>
        <Text variant="display17">{t('who.title')}</Text>
        <MonoLabel>{t('who.label')}</MonoLabel>
      </View>
      <SegmentedControl options={options} value={segment} onChange={onSegment} />
      <Breakdown view={view} />
      <Text variant="body12" color="textSecondary">
        {t('who.basis')}
      </Text>
    </View>
  );
}

// Also used by the creator's attendance page, which has a single "all" group.
export function Breakdown({ view }: { view: StatsView | null }) {
  const { t } = useTranslation('venue');
  if (!view) return null;
  if (view.kind === 'hidden') return <EmptyState message={t(`who.hidden.${view.segment}`)} />;
  return (
    <View style={styles.cards}>
      <AgeStatCard averageAge={view.avgAge} />
      <GenderBar femalePct={view.femalePct} malePct={view.malePct} />
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.md },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cards: { gap: spacing.md },
});
