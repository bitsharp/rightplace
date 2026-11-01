import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import type { Band } from '@/features/nights/domain/band';
import { colors, radius, spacing } from '@/theme/tokens';

import { BandPair } from './BandPair';

type Props = {
  name: string;
  meta: string;
  goingBand: Band;
  maybeBand: Band;
  onPress: () => void;
  sponsored?: boolean;
};

export function VenueRow({ name, meta, goingBand, maybeBand, onPress, sponsored = false }: Props) {
  const { t } = useTranslation('ui');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={name}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.texts}>
        {sponsored ? <MonoLabel tone="going">{t('labels.sponsored')}</MonoLabel> : null}
        <Text variant="body15Strong">{name}</Text>
        <Text variant="body12" color="textSecondary">
          {meta}
        </Text>
      </View>
      <BandPair goingBand={goingBand} maybeBand={maybeBand} layout="column" />
    </Pressable>
  );
}

export const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
});

const styles = StyleSheet.create({
  row: rowStyles.row,
  texts: { flex: 1, gap: 3 },
});
