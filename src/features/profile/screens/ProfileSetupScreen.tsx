import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { signOut } from '@/features/auth/api';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { isSupportedLanguage, type Language } from '@/i18n/domain/pickLanguage';
import { track } from '@/lib/analytics';
import type { RpcErrorCode } from '@/lib/rpcError';

import type { ProfileInput } from '../api';
import { ProfileForm } from '../components/ProfileForm';
import type { ProfileFormInitial } from '../components/useProfileFormState';
import { useOnboardingStore } from '../store/onboardingStore';
import { useSaveProfile } from '../useSaveProfile';

const emptyProfile = (locale: Language): ProfileFormInitial => ({
  birthDate: null,
  gender: null,
  locale,
  locationOptIn: false,
  contactsOptIn: false,
  isCreator: false,
});

function useCompleteOnboarding() {
  const save = useSaveProfile();
  const { startHandleReveal, finishHandleReveal } = useOnboardingStore();
  const [error, setError] = useState<RpcErrorCode | null>(null);
  const submit = async (input: ProfileInput) => {
    startHandleReveal();
    const code = await save(input);
    if (code) {
      finishHandleReveal();
      return setError(code);
    }
    track('profile_completed'); // no age band or gender in analytics (prompt 05 §8)
  };
  return { submit, error };
}

export function ProfileSetupScreen() {
  const { t, i18n } = useTranslation('profile');
  const { submit, error } = useCompleteOnboarding();
  const locale = isSupportedLanguage(i18n?.language) ? i18n.language : 'it';
  const signOutButton = (
    <Button label={t('setup.signOut')} variant="ghost" size="md" onPress={() => void signOut()} />
  );
  return (
    <Screen scroll>
      <AuthHeader step={t('setup.step')} title={t('setup.title')} body={t('setup.body')} />
      <ProfileForm
        initial={emptyProfile(locale)}
        submitLabel={t('setup.cta')}
        onSubmit={submit}
        errorMessage={error ? t(`errors:rpc.${error}`) : undefined}
        underageAction={signOutButton}
      />
    </Screen>
  );
}
