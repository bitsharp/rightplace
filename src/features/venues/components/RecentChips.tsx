import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { colors, radius, spacing } from '@/theme/tokens';

import type { RecentVenue } from '../domain/recent';

type Props = { recents: RecentVenue[]; onOpen: (venueId: string) => void };

const HIT_SLOP = { top: 6, bottom: 6 };

export function RecentChips({ recents, onOpen }: Props) {
  const { t } = useTranslation('venues');
  if (recents.length === 0) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <MonoLabel>{t('recent')}</MonoLabel>
      {recents.map((recent) => (
        <Pressable
          key={recent.venueId}
          accessibilityRole="button"
          accessibilityLabel={t('recentA11y', { name: recent.name })}
          hitSlop={HIT_SLOP}
          onPress={() => onOpen(recent.venueId)}
          style={styles.chip}
        >
          <Text variant="body12" color="textSecondary">
            {recent.name}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', gap: spacing.sm },
  chip: {
    height: 32,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
