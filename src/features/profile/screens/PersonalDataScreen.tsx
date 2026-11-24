import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Toast } from '@/components/ui/Toast';
import { useSession } from '@/features/auth/useSession';
import type { RpcErrorCode } from '@/lib/rpcError';

import type { ProfileInput } from '../api';
import { EmailCard } from '../components/EmailCard';
import { ProfileForm } from '../components/ProfileForm';
import { SettingsPage } from '../components/SettingsPage';
import { useSaveProfile } from '../useSaveProfile';

// Age and gender (shown to others only as a band and a label), the creator flag and my read-only email.
export function PersonalDataScreen() {
  const { t } = useTranslation('profile');
  const { profile, email } = useSession();
  const save = useSaveProfile();
  const [result, setResult] = useState<'saved' | RpcErrorCode | null>(null);
  if (!profile) return null;
  const submit = async (input: ProfileInput) => setResult((await save(input)) ?? 'saved');
  return (
    <SettingsPage title={t('settings.rows.personal')}>
      <ProfileForm
        initial={profile}
        fields="personal"
        submitLabel={t('app.save')}
        onSubmit={submit}
        errorMessage={result && result !== 'saved' ? t(`errors:rpc.${result}`) : undefined}
      />
      {result === 'saved' ? <Toast tone="success" message={t('app.saved')} /> : null}
      <EmailCard email={email ?? ''} />
    </SettingsPage>
  );
}
