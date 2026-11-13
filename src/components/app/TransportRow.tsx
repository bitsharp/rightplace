import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { Text } from '@/components/ui/Text';
import { heights } from '@/theme/tokens';

import { rowStyles } from './VenueRow';

type Props = {
  badge: string;
  name: string;
  detail: string;
  // A word ("APRI") or an icon (a phone for calls); an icon-only action needs `accessibilityLabel`.
  action: string | { icon: IconName };
  accessibilityLabel?: string;
  onPress: () => void;
};

function Action({ action }: { action: Props['action'] }) {
  if (typeof action === 'string') {
    return (
      <Text variant="label11" color="going">
        {action}
      </Text>
    );
  }
  return (
    <View testID="transport-action" style={styles.iconArea}>
      <Icon name={action.icon} color="going" />
    </View>
  );
}

// "Andare e tornare" only deep-links to external apps or tel: (roadmap decision): no API integration.
export function TransportRow({ badge, name, detail, action, accessibilityLabel, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? `${name}, ${detail}`}
      onPress={onPress}
      style={rowStyles.row}
    >
      <Text variant="label11" color="maybe" style={styles.badge}>
        {badge}
      </Text>
      <View style={styles.texts}>
        <Text variant="body15Strong">{name}</Text>
        <Text variant="body12" color="textSecondary">
          {detail}
        </Text>
      </View>
      <Action action={action} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { width: 52 },
  texts: { flex: 1, gap: 2 },
  iconArea: {
    minWidth: heights.minTapTarget,
    minHeight: heights.minTapTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
