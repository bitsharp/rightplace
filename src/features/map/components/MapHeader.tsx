import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Glow } from '@/components/ui/Glow';
import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, heights, radius, spacing } from '@/theme/tokens';

import { splitTitle } from '../domain/mapTitle';

type Props = {
  cityName: string | null;
  // The map has no filters of its own: the icon opens the search, where the city and type filters live.
  onOpenFilters: () => void;
};

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
export function MapHeader({ cityName, onOpenFilters }: Props) {
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('header.filters')}
        onPress={onOpenFilters}
        style={styles.filters}
      >
        <Icon name="filters" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.lg,
  },
  glow: { top: -GLOW_RADIUS / 2, left: -GLOW_RADIUS / 2, opacity: 0.35 },
  texts: { flex: 1, gap: spacing.xs },
  filters: {
    width: heights.minTapTarget,
    height: heights.minTapTarget,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.goingBorder,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
