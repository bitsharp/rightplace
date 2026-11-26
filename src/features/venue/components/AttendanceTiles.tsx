import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { EstimateTag } from '@/components/app/EstimateTag';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { useBandLabel } from '@/components/ui/useBandLabel';
import type { Band, Intent } from '@/features/nights/domain/band';
import { colors, radius, spacing } from '@/theme/tokens';

type Props = {
  going: Band;
  maybe: Band;
  // The bands include estimated presence: each tile says STIMA.
  estimate?: boolean;
};

const BORDER: Record<Intent, string> = { going: colors.goingBorder, maybe: colors.maybeBorder };

function Tile({ intent, band, estimate }: { intent: Intent; band: Band; estimate: boolean }) {
  const { t } = useTranslation('venue');
  const bandLabel = useBandLabel();
  return (
    <View style={[styles.tile, { borderColor: BORDER[intent] }]}>
      <MonoLabel tone={intent} size="medium">
        {t(`tiles.${intent}`)}
      </MonoLabel>
      <Text variant="display26">{bandLabel(band)}</Text>
      {band === 'pochi' ? null : (
        <Text variant="body12" color="textSecondary">
          {t('ui:people')}
        </Text>
      )}
      {estimate ? <EstimateTag /> : null}
    </View>
  );
}

// The two big tiles of the venue page: always a band (principle 2), "pochi" under k = 3, never a count.
export function AttendanceTiles({ going, maybe, estimate = false }: Props) {
  return (
    <View style={styles.row}>
      <Tile intent="going" band={going} estimate={estimate} />
      <Tile intent="maybe" band={maybe} estimate={estimate} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  tile: {
    flex: 1,
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
});
