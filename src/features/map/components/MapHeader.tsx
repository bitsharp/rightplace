import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Glow } from '@/components/ui/Glow';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import { splitTitle } from '../domain/mapTitle';

import { CONTROLS_WIDTH } from './MapControls';

type Props = { cityName: string | null };

const GLOW_RADIUS = 110;

function Title({ cityName }: { cityName: string | null }) {
  const { t } = useTranslation('map');
  if (!cityName) return <Text variant="display30">{t('header.titleNoCity')}</Text>;
  const { lead, city } = splitTitle(t('header.title', { city: cityName }), cityName);
  return (
    <Text variant="display30" numberOfLines={3} adjustsFontSizeToFit>
      {lead}
      {'\n'}
      <Text variant="display30" color="primary" testID="map-title-city">
        {city}
      </Text>
    </Text>
  );
}

// Big "STASERA {CITY}" drawn over the top of the map; the box lets touches through to the map.
export function MapHeader({ cityName }: Props) {
  const { t } = useTranslation('map');
  return (
    <View pointerEvents="box-none" style={styles.header}>
      <Glow radius={GLOW_RADIUS} style={styles.glow} />
      <View pointerEvents="none" style={styles.texts}>
        <Title cityName={cityName} />
        <Text variant="body13" color="textSecondary">
          {t('header.subtitle')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.lg,
    // Leaves the right column of map buttons clear.
    paddingRight: spacing.lg + CONTROLS_WIDTH + spacing.md,
  },
  glow: { top: -GLOW_RADIUS / 2, left: -GLOW_RADIUS / 2, opacity: 0.35 },
  texts: { flex: 1, gap: spacing.xs },
});
