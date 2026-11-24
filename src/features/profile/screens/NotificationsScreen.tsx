import { useTranslation } from 'react-i18next';

import { NotificationSettings } from '@/features/notifications/components/NotificationSettings';

import { SettingsPage } from '../components/SettingsPage';

export function NotificationsScreen() {
  const { t } = useTranslation('profile');
  return (
    <SettingsPage title={t('settings.rows.notifications')}>
      <NotificationSettings />
    </SettingsPage>
  );
}
