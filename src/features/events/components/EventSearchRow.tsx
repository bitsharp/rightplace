import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { rowStyles } from '@/components/app/VenueRow';
import { BandPair } from '@/components/app/BandPair';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import type { Band } from '@/features/nights/domain/band';

type Props = {
  name: string;
  venueName: string;
  whenLabel: string;
  goingBand: Band;
  maybeBand: Band;
  onPress: () => void;
  sponsored?: boolean;
};

// A creator's night in the search results: the date/time badge leads (Ricerca.dc.html).
export function EventSearchRow({
  name,
  venueName,
  whenLabel,
  goingBand,
  maybeBand,
  onPress,
  sponsored = false,
}: Props) {
  const { t } = useTranslation('ui');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${venueName}`}
      onPress={onPress}
      style={rowStyles.row}
    >
      <View style={styles.texts}>
        {sponsored ? <MonoLabel tone="going">{t('labels.sponsored')}</MonoLabel> : null}
        <MonoLabel tone="maybe">{whenLabel}</MonoLabel>
        <Text variant="body15Strong">{name}</Text>
        <Text variant="body12" color="textSecondary">
          {venueName}
        </Text>
      </View>
      <BandPair goingBand={goingBand} maybeBand={maybeBand} layout="column" />
    </Pressable>
  );
}

const styles = StyleSheet.create({ texts: { flex: 1, gap: 3 } });
