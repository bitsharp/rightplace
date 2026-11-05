import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { colors, heights, radius, spacing } from '@/theme/tokens';

export const TAB_NAMES = ['map', 'friends', 'chat', 'feed', 'profile'] as const;
export type TabName = (typeof TAB_NAMES)[number];

export function isTabName(name: string): name is TabName {
  return TAB_NAMES.some((tab) => tab === name);
}

type Props = {
  active: TabName;
  onSelect: (name: TabName) => void;
  // Pending items per tab (e.g. follow requests on "friends"); 0 or missing shows nothing.
  badges?: Partial<Record<TabName, number>>;
};

const MAX_BADGE = 9;

// Pressable is the one accessible element: the pending count is read as part of its label.
const tabLabel = (name: string, badge: string, count: number) =>
  count > 0 ? `${name}, ${badge}` : name;

function TabBadge({ name, count }: { name: TabName; count: number }) {
  const { t } = useTranslation('common');
  return (
    <View
      testID={`tab-badge-${name}`}
      accessibilityLabel={t('tabBadge', { count })}
      style={styles.badge}
    >
      <Text variant="label10" color="onAccent" style={styles.badgeText}>
        {count > MAX_BADGE ? `${MAX_BADGE}+` : String(count)}
      </Text>
    </View>
  );
}

type TabItemProps = {
  name: TabName;
  selected: boolean;
  count: number;
  onSelect: (name: TabName) => void;
};

function TabItem({ name, selected, count, onSelect }: TabItemProps) {
  const { t } = useTranslation('common');
  const color = selected ? 'primary' : 'textSecondary';
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={tabLabel(t(`tabs.${name}`), t('tabBadge', { count }), count)}
      accessibilityState={{ selected }}
      onPress={() => onSelect(name)}
      style={styles.item}
    >
      <View>
        <Icon name={name} size={22} color={color} />
        {count > 0 ? <TabBadge name={name} count={count} /> : null}
      </View>
      <Text variant="body11Medium" color={color}>
        {t(`tabs.${name}`)}
      </Text>
    </Pressable>
  );
}

export function TabBar({ active, onSelect, badges }: Props) {
  const { bottom } = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={{ paddingBottom: bottom, backgroundColor: colors.background }}
    >
      <View testID="tab-bar" style={styles.bar}>
        {TAB_NAMES.map((name) => (
          <TabItem
            key={name}
            name={name}
            selected={name === active}
            count={badges?.[name] ?? 0}
            onSelect={onSelect}
          />
        ))}
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
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  badgeText: { letterSpacing: 0 },
});
