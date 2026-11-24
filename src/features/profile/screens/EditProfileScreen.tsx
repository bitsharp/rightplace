import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Screen';
import { useSession } from '@/features/auth/useSession';
import { UiKitLink } from '@/features/dev/UiKitLink';

import { AccountFooter } from '../components/AccountFooter';
import { BackHeader } from '../components/BackHeader';
import { SettingsList } from '../components/SettingsList';

// "Edit profile": the list of settings (account, help, information), then "Esci" and "Delete account".
// Photo, @tag, age, gender, position, contacts, city, notifications... each live on their own screen.
export function EditProfileScreen() {
  const { t } = useTranslation('profile');
  const { profile } = useSession();
  if (!profile) return null;
  return (
    <Screen scroll>
      <BackHeader title={t('edit.title')} />
      <SettingsList profile={profile} />
      <AccountFooter />
      <UiKitLink />
    </Screen>
  );
}
