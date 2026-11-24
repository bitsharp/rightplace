import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { heights, spacing } from '@/theme/tokens';

type Props = {
  icon: IconName;
  title: string;
  // the current value of the setting, shown on the right (e.g. the language)
  value?: string;
  onPress: () => void;
};

// A row of the profile settings list (Profilo, mock-up screen 5): icon, title, value and chevron.
export function SettingsRow({ icon, title, value, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={value ? `${title}, ${value}` : title}
      onPress={onPress}
      style={styles.row}
    >
      <Icon name={icon} size={22} color="textSecondary" />
      <Text variant="body15" style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {value ? (
        <View style={styles.value}>
          <Text variant="body14" color="textSecondary" numberOfLines={1}>
            {value}
          </Text>
        </View>
      ) : null}
      <Icon name="chevronRight" size={18} color="textSecondary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: heights.minTapTarget,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  title: { flex: 1 },
  value: { maxWidth: '45%' },
});
