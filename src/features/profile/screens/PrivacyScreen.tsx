import { useTranslation } from 'react-i18next';

import { Text } from '@/components/ui/Text';
import { useSession } from '@/features/auth/useSession';

import { BlockedSection } from '../components/BlockedSection';
import { FindMeByPhone } from '../components/FindMeByPhone';
import { ContactsToggle, LocationToggle } from '../components/ProfileFields';
import { SettingsPage } from '../components/SettingsPage';
import { useProfilePrivacy } from '../useProfilePrivacy';

// Position, contacts, "find me by phone" and blocked users: the privacy choices in one place.
export function PrivacyScreen() {
  const { t } = useTranslation('profile');
  const { profile } = useSession();
  if (!profile) return null;
  return (
    <SettingsPage title={t('settings.rows.privacy')}>
      <PrivacyBody profile={profile} />
    </SettingsPage>
  );
}

function PrivacyBody({
  profile,
}: {
  profile: NonNullable<ReturnType<typeof useSession>['profile']>;
}) {
  const { t } = useTranslation('profile');
  const privacy = useProfilePrivacy(profile);
  return (
    <>
      <LocationToggle value={privacy.locationOptIn} onChange={privacy.setLocationOptIn} />
      <ContactsToggle value={privacy.contactsOptIn} onChange={privacy.setContactsOptIn} />
      {privacy.error ? <Text color="error">{t(`errors:rpc.${privacy.error}`)}</Text> : null}
      {privacy.contactsOptIn ? <FindMeByPhone /> : null}
      <BlockedSection />
    </>
  );
}
