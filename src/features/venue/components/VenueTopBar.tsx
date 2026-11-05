import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, heights, spacing } from '@/theme/tokens';

// Always on screen, even while the venue loads or fails: the way back must never disappear.
export function VenueTopBar({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation('venue');
  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('back')}
        onPress={onBack}
        style={styles.back}
      >
        <Icon name="chevronLeft" />
      </Pressable>
      <Text accessibilityRole="header" variant="label12" color="textSecondary" style={styles.title}>
        {t('title')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  back: {
    width: heights.buttonMedium,
    height: heights.buttonMedium,
    borderRadius: heights.buttonMedium / 2,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { textTransform: 'uppercase' },
});
