import { StyleSheet, View } from 'react-native';

import { colors, radius, spacing } from '@/theme/tokens';

import { Icon } from './Icon';
import { Text } from './Text';

type Props = {
  message: string;
  tone?: 'info' | 'success';
};

export function Toast({ message, tone = 'info' }: Props) {
  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      style={styles.toast}
    >
      {tone === 'success' ? <Icon name="check" size={22} color="maybe" /> : null}
      <Text variant="body14" style={styles.message}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md + 2,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.maybeBorder,
    backgroundColor: colors.maybeTint,
  },
  message: { flex: 1 },
});
