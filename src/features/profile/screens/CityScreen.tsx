import { useTranslation } from 'react-i18next';

import { useSession } from '@/features/auth/useSession';

import { CityPicker } from '../components/CityPicker';
import { SettingsPage } from '../components/SettingsPage';

export function CityScreen() {
  const { t } = useTranslation('profile');
  const { profile } = useSession();
  if (!profile) return null;
  return (
    <SettingsPage title={t('settings.rows.city')}>
      <CityPicker locationOn={profile.locationOptIn} />
    </SettingsPage>
  );
}
