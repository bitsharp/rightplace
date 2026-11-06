import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { rowStyles } from '@/components/app/VenueRow';
import { Icon } from '@/components/ui/Icon';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import type { VenueKind } from '@/features/venues/domain/venueList';
import { spacing } from '@/theme/tokens';

type Props = { name: string; kind: VenueKind; onPress: () => void };

// "Il locale" under the night: the venue's own page (numbers of its regular nights) is one tap away.
export function EventVenueCard({ name, kind, onPress }: Props) {
  const { t } = useTranslation('event');
  return (
    <View style={styles.block}>
      <MonoLabel>{t('venueSection')}</MonoLabel>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('openVenue', { venue: name })}
        onPress={onPress}
        style={rowStyles.row}
      >
        <View style={styles.texts}>
          <Text variant="body15Strong">{name}</Text>
          <Text variant="body12" color="textSecondary">
            {t(`venues:kind.${kind}`)}
          </Text>
        </View>
        <Icon name="chevronRight" color="textSecondary" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  texts: { flex: 1, gap: 3 },
});
