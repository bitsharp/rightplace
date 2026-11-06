import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { RangeStat } from '@/components/ui/RangeStat';
import { Text } from '@/components/ui/Text';
import { Breakdown } from '@/features/venue/components/WhoIsGoing';
import { spacing } from '@/theme/tokens';

import { CreatorShell } from '../components/CreatorShell';
import { useCreatorEvent } from '../useCreatorEvent';

type Screen = ReturnType<typeof useCreatorEvent>;

// What the creator learns about their night: bands and, from 3 people, age and gender. Never who.
export function CreatorEventScreen({ eventId }: { eventId: string }) {
  const { t } = useTranslation('creator');
  const screen = useCreatorEvent(eventId);
  return (
    <CreatorShell title={t('attendanceTitle')} onBack={screen.goBack}>
      {screen.notFound ? <EmptyState message={t('attendance.notFound')} /> : null}
      {screen.event && screen.mine ? <Body screen={screen} /> : null}
    </CreatorShell>
  );
}

function Body({ screen }: { screen: Screen }) {
  const { t } = useTranslation('creator');
  const { event } = screen;
  if (!event) return null;
  return (
    <View style={styles.body}>
      <View style={styles.heading}>
        {screen.cancelled ? <MonoLabel>{t('attendance.cancelled')}</MonoLabel> : null}
        <Text variant="display22">{event.name}</Text>
        <Text
          variant="body13"
          color="textSecondary"
        >{`${screen.meta} · ${screen.targetLabel}`}</Text>
        <MonoLabel tone="maybe">{screen.whenLabel}</MonoLabel>
      </View>
      <Attendance screen={screen} />
      <Actions screen={screen} />
    </View>
  );
}

function Attendance({ screen }: { screen: Screen }) {
  const { t } = useTranslation('creator');
  return (
    <View style={styles.section}>
      <Text variant="display17">{t('attendance.bands')}</Text>
      <View style={styles.bands}>
        <RangeStat intent="going" band={screen.bands?.goingBand ?? 'pochi'} />
        <RangeStat intent="maybe" band={screen.bands?.maybeBand ?? 'pochi'} />
      </View>
      <Breakdown view={screen.stats} />
      <Text variant="body12" color="textSecondary">
        {t('attendance.note')}
      </Text>
    </View>
  );
}

function Actions({ screen }: { screen: Screen }) {
  const { t } = useTranslation('creator');
  if (screen.cancelled) return null;
  return (
    <View style={styles.section}>
      {screen.editable ? (
        <Button label={t('attendance.edit')} variant="secondary" onPress={screen.openEdit} />
      ) : null}
      {screen.confirming ? (
        <CancelConfirm screen={screen} />
      ) : (
        <Button label={t('attendance.cancel')} variant="ghost" onPress={screen.askCancel} />
      )}
    </View>
  );
}

// Same "light" confirmation as the declaration sheet: an inline question, not a blocking alert.
function CancelConfirm({ screen }: { screen: Screen }) {
  const { t } = useTranslation('creator');
  return (
    <Card tone="dashed" style={styles.confirm}>
      <Text variant="body14">{t('attendance.cancelConfirm')}</Text>
      <View style={styles.row}>
        <Button
          label={t('attendance.confirmYes')}
          variant="danger"
          size="md"
          loading={screen.cancelling}
          onPress={screen.confirmCancel}
          style={styles.flex}
        />
        <Button
          label={t('attendance.confirmNo')}
          variant="ghost"
          size="md"
          onPress={screen.keep}
          style={styles.flex}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.xxl },
  heading: { gap: spacing.xs },
  section: { gap: spacing.md },
  bands: { flexDirection: 'row', gap: spacing.md },
  confirm: { gap: spacing.md },
  row: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1 },
});
