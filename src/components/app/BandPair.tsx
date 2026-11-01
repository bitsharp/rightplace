import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { useBandLabel } from '@/components/ui/useBandLabel';
import type { Band } from '@/features/nights/domain/band';
import { spacing } from '@/theme/tokens';

type Props = {
  goingBand: Band;
  maybeBand: Band;
  layout: 'column' | 'row';
};

// "SI 30–50 / FORSE pochi" in Space Mono, as in Ricerca and CreatorProfilo.
export function BandPair({ goingBand, maybeBand, layout }: Props) {
  const { t } = useTranslation('ui');
  const bandLabel = useBandLabel();
  const variant = layout === 'column' ? 'label11' : 'label12';
  return (
    <View style={layout === 'column' ? styles.column : styles.row}>
      <Text variant={variant} color="going">{`${t('intent.going')} ${bandLabel(goingBand)}`}</Text>
      <Text variant={variant} color="maybe">{`${t('intent.maybe')} ${bandLabel(maybeBand)}`}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: 'flex-end', gap: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
});
