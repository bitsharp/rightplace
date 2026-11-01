import { StyleSheet } from 'react-native';

import { spacing } from '@/theme/tokens';

import { Card } from './Card';
import { Text } from './Text';

type Props = { message: string };

// "Meno di 3 persone… dati nascosti" (Locale.dc.html): the k-anonymity fallback.
export function EmptyState({ message }: Props) {
  return (
    <Card testID="empty-state" tone="dashed" style={styles.card}>
      <Text variant="body13" color="textSecondary">
        {message}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({ card: { padding: spacing.lg } });
