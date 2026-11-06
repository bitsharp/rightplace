import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { useMapStore } from '@/features/map/store/mapStore';
import { useCityVenues } from '@/features/venues/hooks';
import { spacing } from '@/theme/tokens';

import { CreatorShell } from '../components/CreatorShell';
import { EventForm } from '../components/EventForm';
import { useCreatorNavigation } from '../useCreatorNavigation';
import { useEventForm } from '../useEventForm';

// "Crea serata" (CreaSerata.dc.html): the venue comes from the catalog of the city chosen on the map.
export function NewEventScreen() {
  const { t } = useTranslation('creator');
  const { goBack } = useCreatorNavigation();
  const { citySlug } = useMapStore();
  const venues = useCityVenues(citySlug);
  const form = useEventForm({ onDone: goBack });
  return (
    <CreatorShell title={t('newEvent')} onBack={goBack}>
      <View style={styles.heading}>
        <MonoLabel tone="maybe" size="large">
          {t('form.label')}
        </MonoLabel>
        <Text variant="display22">{t('form.title')}</Text>
      </View>
      <EventForm form={form} venues={venues.data ?? []} mode="create" />
    </CreatorShell>
  );
}

const styles = StyleSheet.create({ heading: { gap: spacing.sm } });
