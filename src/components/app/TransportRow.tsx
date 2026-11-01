import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';

import { rowStyles } from './VenueRow';

type Props = {
  badge: string;
  name: string;
  detail: string;
  action: string;
  onPress: () => void;
};

// "Andare e tornare" only deep-links to external apps or tel: (roadmap decision): no API integration.
export function TransportRow({ badge, name, detail, action, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${name}, ${detail}`}
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
      <Text variant="label11" color="going">
        {action}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  badge: { width: 52 },
  texts: { flex: 1, gap: 2 },
});
