import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { Card } from '@/components/ui/Card';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import type { MapBanner as MapBannerKind } from '../domain/mapLayers';

// Never a lock or a blur: the map is always visible (principle 11); this only explains what is shown.
export function MapBanner({ kind }: { kind: MapBannerKind }) {
  const { t } = useTranslation('map');
  if (kind === 'none') return null;
  return (
    <Card style={styles.card}>
      <Text variant="body13" color="textSecondary">
        {t(`banner.${kind}`)}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({ card: { padding: spacing.md } });
