import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { spacing } from '@/theme/tokens';

import { formatMinutes } from './domain/format';
import type { UsageEvent } from './domain/types';

// One login or session: when, for how long (sessions only), on which platform and version.
export function UsageEventRow({ event }: { event: UsageEvent }) {
  const { t, i18n } = useTranslation('admin');
  const when = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(event.startedAt));
  const device = [event.platform, event.appVersion].filter(Boolean).join(' · ');
  return (
    <Card style={styles.card}>
      <View style={styles.head}>
        <Text variant="body14Medium">{t(`usage.kind.${event.kind}`)}</Text>
        <MonoLabel tone="muted">{when}</MonoLabel>
      </View>
      {event.kind === 'session' ? (
        <Text variant="body13">{formatMinutes(event.minutes, i18n.language)}</Text>
      ) : null}
      <Text variant="body12" color="textSecondary">
        {device}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.lg, gap: spacing.xs },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
