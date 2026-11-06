import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { formatHandle } from '@/features/profile/domain/handle';
import { spacing } from '@/theme/tokens';

import type { EventDetail } from '../api';

type Props = { event: EventDetail; whenLabel: string; targetLabel: string; cancelled: boolean };

export function EventHeader({ event, whenLabel, targetLabel, cancelled }: Props) {
  const { t } = useTranslation('event');
  return (
    <View style={styles.block}>
      {cancelled ? <CancelledBanner /> : null}
      <MonoLabel tone="maybe" size="medium">
        {whenLabel}
      </MonoLabel>
      <Text variant="display24">{event.name}</Text>
      <Text variant="body13" color="textSecondary">
        {t('by', { handle: formatHandle(event.creatorHandle) })}
      </Text>
      {event.description ? <Text variant="body14">{event.description}</Text> : null}
      <Text variant="body13" color="textSecondary">
        {t('target', { target: targetLabel })}
      </Text>
    </View>
  );
}

function CancelledBanner() {
  const { t } = useTranslation('event');
  return (
    <Card tone="dashed" style={styles.banner}>
      <Text variant="body15Strong">{t('cancelledBanner')}</Text>
      <Text variant="body13" color="textSecondary">
        {t('cancelledBody')}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  banner: { gap: spacing.xs },
});
