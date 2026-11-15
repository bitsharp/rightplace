import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { useSession } from '@/features/auth/useSession';
import type { RpcErrorCode } from '@/lib/rpcError';

import { HandleEditor } from '../components/HandleEditor';
import { HandleReveal } from '../components/HandleReveal';
import { useConfirmHandle } from '../useHandleChange';

// Onboarding step: the @tag is free until "Continua". Once the server confirms it the session becomes ready
// and the router leaves this screen by itself (the step is guarded by the session status, not by local state).
export function HandleScreen() {
  const { t } = useTranslation('profile');
  const { profile } = useSession();
  const confirm = useConfirmHandle();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<RpcErrorCode | null>(null);

  const next = async () => {
    setBusy(true);
    setError(await confirm());
    setBusy(false);
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
            phase="onboarding"
          />
        </>
      ) : null}
      <Text variant="body13" color="textSecondary">
        {t('handle.freeUntilContinue')}
      </Text>
      {error ? <Text color="error">{t(`errors:rpc.${error}`)}</Text> : null}
      <Button label={t('handle.enter')} onPress={next} loading={busy} feedback="confirm" />
    </Screen>
  );
}
