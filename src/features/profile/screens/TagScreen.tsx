import { useTranslation } from 'react-i18next';

import { useSession } from '@/features/auth/useSession';

import { HandleSection } from '../components/HandleSection';
import { SettingsPage } from '../components/SettingsPage';

export function TagScreen() {
  const { t } = useTranslation('profile');
  const { profile } = useSession();
  if (!profile) return null;
  return (
    <SettingsPage title={t('settings.rows.tag')}>
      <HandleSection
        handle={profile.handle}
        handleChangedAt={profile.handleChangedAt}
        handleFreeChangeUsed={profile.handleFreeChangeUsed}
      />
    </SettingsPage>
  );
}
