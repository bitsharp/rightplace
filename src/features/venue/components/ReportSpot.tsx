import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Text } from '@/components/ui/Text';
import { useReportSpot } from '@/features/spots/hooks';
import { rpcErrorCodeOf } from '@/lib/rpcError';
import { spacing } from '@/theme/tokens';

// Report goes through a confirmation (it cannot be undone and the author is never told who reported).
export function ReportSpot({ venueId }: { venueId: string }) {
  const { t } = useTranslation('venue');
  const report = useReportSpot();
  const [confirming, setConfirming] = useState(false);
  const code = rpcErrorCodeOf(report.error);

  if (report.isSuccess) {
    return (
      <Text variant="body13" color="textSecondary">
        {t('spot.reported')}
      </Text>
    );
  }
  if (!confirming) {
    return <Button label={t('spot.report')} variant="ghost" onPress={() => setConfirming(true)} />;
  }
  return (
    <View style={styles.block}>
      <Text variant="body13" color="textSecondary">
        {t('spot.reportBody')}
      </Text>
      {code ? (
        <Text variant="body13" color="error">
          {t(`errors:rpc.${code}`)}
        </Text>
      ) : null}
      <Button
        label={t('spot.reportConfirm')}
        variant="danger"
        loading={report.isPending}
        onPress={() => report.mutate(venueId)}
      />
      <Button label={t('spot.reportCancel')} variant="ghost" onPress={() => setConfirming(false)} />
    </View>
  );
}

const styles = StyleSheet.create({ block: { gap: spacing.md } });
