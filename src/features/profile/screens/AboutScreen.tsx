import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/Text';

import { SettingsPage } from '../components/SettingsPage';

// Deliberately minimal: the app name and its version, nothing about the company.
export function AboutScreen() {
  const { t } = useTranslation('profile');
  return (
    <SettingsPage title={t('about.title')}>
      <Text variant="display24">{t('about.appName')}</Text>
      <Text color="textSecondary">
        {t('about.version', { version: Constants.expoConfig?.version ?? '' })}
      </Text>
    </SettingsPage>
  );
}
