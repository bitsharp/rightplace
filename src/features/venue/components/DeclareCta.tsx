import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { colors, spacing } from '@/theme/tokens';

// Fixed at the bottom so the declaration is always one tap away (principle 10).
export function DeclareCta({
  onPress,
  disabled = false,
}: {
  onPress: () => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation('venue');
  return (
    <View style={styles.bar}>
      <Button label={t('cta')} onPress={onPress} feedback="selection" disabled={disabled} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
});
