import { Pressable, StyleSheet, View } from 'react-native';

import { selectionFeedback } from '@/lib/haptics';
import { colors, heights, spacing } from '@/theme/tokens';

import { Icon } from './Icon';
import { Text } from './Text';

type Props = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

export function Checkbox({ label, checked, onChange }: Props) {
  const toggle = () => {
    selectionFeedback();
    onChange(!checked);
  };
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityState={{ checked }}
      onPress={toggle}
      style={styles.row}
    >
      <View testID="checkbox-box" style={[styles.box, checked ? styles.checked : styles.unchecked]}>
        {checked ? <Icon name="check" size={16} color="onAccent" strokeWidth={2.6} /> : null}
      </View>
      <Text variant="body14" color="textSecondary" style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: heights.minTapTarget,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colors.primary, borderColor: colors.primary },
  unchecked: { backgroundColor: colors.surface, borderColor: colors.border },
  label: { flex: 1 },
});
