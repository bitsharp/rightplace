import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { MonoLabel } from '@/components/ui/MonoLabel';
import { Text } from '@/components/ui/Text';
import { Toggle } from '@/components/ui/Toggle';
import { StepPicker } from '@/features/creator/components/StepPicker';
import { useSession } from '@/features/auth/useSession';
import { useCreatorUi } from '@/features/creator/useCreatorUi';
import { spacing } from '@/theme/tokens';

import {
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
  type NotificationPrefs,
} from '../domain/prefs';
import type { PermissionStatus } from '../domain/permissionAsk';
import { DAY_ORDER, stepReminderTime, toggleDay } from '../domain/reminderTime';
import { useNotificationPrefs, useSaveNotificationPrefs } from '../hooks';
import { getPermissionStatus, openSystemSettings } from '../permissions';
import { acceptPrePermission, usePrePermissionStore } from '../prePermission';

type Save = (patch: Partial<NotificationPrefs>) => void;

function usePermissionStatus(): PermissionStatus | null {
  const [status, setStatus] = useState<PermissionStatus | null>(null);
  const version = usePrePermissionStore((state) => state.permissionVersion);
  useEffect(() => {
    void getPermissionStatus().then(setStatus);
  }, [version]);
  return status;
}

function PermissionStatusRow() {
  const { t } = useTranslation('notifications');
  const status = usePermissionStatus();
  if (status === null) return null;
  return (
    <View style={styles.group}>
      <Text variant="body13" color="textSecondary">
        {t(`settings.permission.${status}`)}
      </Text>
      {status === 'denied' ? (
        <Button
          label={t('settings.permission.openSettings')}
          variant="ghost"
          size="md"
          onPress={() => void openSystemSettings()}
        />
      ) : null}
      {status === 'undetermined' ? (
        <Button
          label={t('settings.permission.enable')}
          variant="secondary"
          size="md"
          onPress={() => void acceptPrePermission()}
        />
      ) : null}
    </View>
  );
}

function ReminderSchedule({ prefs, save }: { prefs: NotificationPrefs; save: Save }) {
  const { t } = useTranslation('notifications');
  return (
    <View style={styles.group}>
      <MonoLabel tone="maybe">{t('settings.days.label')}</MonoLabel>
      <View style={styles.days}>
        {DAY_ORDER.map((day) => (
          <Chip
            key={day}
            label={t(`settings.days.short.${day}`)}
            accessibilityLabel={t(`settings.days.long.${day}`)}
            selected={prefs.reminderDays.includes(day)}
            onPress={() => save({ reminderDays: toggleDay(prefs.reminderDays, day) })}
          />
        ))}
      </View>
      <StepPicker
        label={t('settings.time.label')}
        valueLabel={prefs.reminderTime}
        previousLabel={t('settings.time.earlier')}
        nextLabel={t('settings.time.later')}
        onPrevious={() => save({ reminderTime: stepReminderTime(prefs.reminderTime, -15) })}
        onNext={() => save({ reminderTime: stepReminderTime(prefs.reminderTime, 15) })}
      />
    </View>
  );
}

// Profile → "Notifiche": a switch per category (the server honours them before queueing), the evening
// reminder's days and time, and the state of the phone's permission.
export function NotificationSettings() {
  const { t } = useTranslation('notifications');
  const { showCreatorProfileLink } = useCreatorUi();
  const isSupport = useSession().profile?.isSupport === true;
  const prefs = useNotificationPrefs().data;
  const { mutate: save } = useSaveNotificationPrefs();
  if (!prefs) return null;
  const categories = NOTIFICATION_CATEGORIES.filter(
    (category) =>
      (category !== 'creator' || showCreatorProfileLink) && (category !== 'support' || isSupport),
  );
  return (
    <View style={styles.section}>
      <MonoLabel tone="maybe">{t('settings.title')}</MonoLabel>
      <PermissionStatusRow />
      {categories.map((category: NotificationCategory) => (
        <Toggle
          key={category}
          title={t(`settings.categories.${category}.title`)}
          description={t(`settings.categories.${category}.description`)}
          value={prefs[category]}
          onValueChange={(value) => save({ [category]: value })}
        />
      ))}
      {prefs.reminder ? <ReminderSchedule prefs={prefs} save={save} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  group: { gap: spacing.sm },
  days: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
