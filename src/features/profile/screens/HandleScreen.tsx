import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { useSession } from '@/features/auth/useSession';

import { HandleEditor } from '../components/HandleEditor';
import { HandleReveal } from '../components/HandleReveal';
import { useOnboardingStore } from '../store/onboardingStore';

export function HandleScreen() {
  const { t } = useTranslation('profile');
  const { profile } = useSession();
  const finishHandleReveal = useOnboardingStore((state) => state.finishHandleReveal);

  const enter = () => {
    finishHandleReveal();
    router.replace('/map');
  };

  return (
    <Screen scroll>
      <AuthHeader step={t('handle.step')} title={t('handle.title')} body={t('handle.body')} />
      {profile ? (
        <>
          <HandleReveal handle={profile.handle} />
          <HandleEditor
            key={profile.handle}
            handle={profile.handle}
            handleChangedAt={profile.handleChangedAt}
          />
        </>
      ) : null}
      <Button label={t('handle.enter')} onPress={enter} feedback="confirm" />
    </Screen>
  );
}
