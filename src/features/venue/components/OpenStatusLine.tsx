import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/Text';
import { colors, spacing } from '@/theme/tokens';

import type { OpenStatus } from '../domain/openingHours';

const DOT = 8;

// "Aperto · Chiude alle 4:00" / "Chiuso": nothing when the hours are unknown.
export function OpenStatusLine({ status }: { status: OpenStatus | null }) {
  const { t } = useTranslation('venue');
  if (!status) return null;
  const open = status.kind === 'open';
  const text = !open
    ? t('status.closed')
    : status.closesAt
      ? t('status.open', { time: status.closesAt })
      : t('status.openNoClose');
  return (
    <View style={styles.row}>
      <View style={[styles.dot, { backgroundColor: open ? colors.going : colors.textSecondary }]} />
      <Text variant="body13" color={open ? 'text' : 'textSecondary'}>
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
});
