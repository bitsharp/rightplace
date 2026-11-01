import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import type { Band } from '@/features/nights/domain/band';
import { spacing } from '@/theme/tokens';

import { BandPair } from './BandPair';

type Props = {
  name: string;
  meta: string;
  whenLabel: string;
  goingBand: Band;
  maybeBand: Band;
  targetLabel: string;
};

// Creators see turnout as bands too, never single people (CreatorProfilo.dc.html).
export function EventRow({ name, meta, whenLabel, goingBand, maybeBand, targetLabel }: Props) {
  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <View style={styles.texts}>
          <Text variant="body15Strong">{name}</Text>
          <Text variant="body12" color="textSecondary">
            {meta}
          </Text>
        </View>
        <MonoLabel>{whenLabel}</MonoLabel>
      </View>
      <View style={styles.bands}>
        <BandPair goingBand={goingBand} maybeBand={maybeBand} layout="row" />
        <Text variant="label12" color="textSecondary">{`· ${targetLabel}`}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm + 2,
  },
  texts: { flex: 1, gap: 3 },
  bands: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
});
