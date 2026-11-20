import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { AUTO_CITY } from '@/features/map/domain/cityChoice';
import { useMapStore } from '@/features/map/store/mapStore';
import { useCurrentCity } from '@/features/map/useCurrentCity';
import { useSession } from '@/features/auth/useSession';
import { useActiveCities } from '@/features/venues/hooks';
import { spacing } from '@/theme/tokens';

// "Città della mappa": Automatica (from the coarse position) or one active city. Choosing never
// asks for the location permission: that stays with the Position toggle (principle 3).
export function CityPicker({ locationOn }: { locationOn: boolean }) {
  const { t } = useTranslation('profile');
  const cities = useActiveCities().data ?? [];
  const preference = useMapStore((state) => state.cityPreference);
  const setPreference = useMapStore((state) => state.setCityPreference);
  const currentSlug = useCurrentCity();
  const isExplicit = cities.some((city) => city.slug === preference);
  // With the position off "auto" falls back to the city saved on the profile, not to the one shown now.
  const profileSlug = useSession().profile?.citySlug ?? currentSlug;
  const profileCityName = cities.find((city) => city.slug === profileSlug)?.name ?? '';
  return (
    <View style={styles.field}>
      <MonoLabel>{t('city.title')}</MonoLabel>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
      >
        <Chip
          label={t('city.auto')}
          tone="maybe"
          selected={!isExplicit}
          onPress={() => setPreference(AUTO_CITY)}
        />
        {cities.map((city) => (
          <Chip
            key={city.slug}
            label={city.name}
            tone="maybe"
            selected={isExplicit && city.slug === preference}
            onPress={() => setPreference(city.slug)}
          />
        ))}
      </ScrollView>
      {locationOn ? null : (
        <Text variant="body13" color="textSecondary">
          {t('city.autoOff', { city: profileCityName })}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  chips: { gap: spacing.sm },
});
