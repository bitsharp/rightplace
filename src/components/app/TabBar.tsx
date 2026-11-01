import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, heights, spacing } from '@/theme/tokens';

export const TAB_NAMES = ['map', 'friends', 'chat', 'feed', 'profile'] as const;
export type TabName = (typeof TAB_NAMES)[number];

export function isTabName(name: string): name is TabName {
  return TAB_NAMES.some((tab) => tab === name);
}

type Props = {
  active: TabName;
  onSelect: (name: TabName) => void;
};

export function TabBar({ active, onSelect }: Props) {
  const { t } = useTranslation('common');
  const { bottom } = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{ paddingBottom: bottom, backgroundColor: colors.background }}
    >
      <View testID="tab-bar" style={styles.bar}>
        {TAB_NAMES.map((name) => {
          const selected = name === active;
          const color = selected ? 'primary' : 'textSecondary';
          return (
            <Pressable
              key={name}
              accessibilityRole="tab"
              accessibilityLabel={t(`tabs.${name}`)}
              accessibilityState={{ selected }}
              onPress={() => onSelect(name)}
              style={styles.item}
            >
              <Icon name={name} size={22} color={color} />
              <Text variant="body11Medium" color={color}>
                {t(`tabs.${name}`)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: heights.tabBar,
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.xs },
});
