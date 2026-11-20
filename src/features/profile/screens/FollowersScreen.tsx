import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Screen';

import { BackHeader } from '../components/BackHeader';
import { FollowersSection } from '../components/FollowersSection';

// The people who follow me (accepted): open from the counter of the profile. "Remove" is silent.
export function FollowersScreen() {
  const { t } = useTranslation('profile');
  return (
    <Screen scroll>
      <BackHeader title={t('followers.screenTitle')} />
      <FollowersSection />
    </Screen>
  );
}
