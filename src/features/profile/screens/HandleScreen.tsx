import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { AuthHeader } from '@/features/auth/components/AuthHeader';
import { useSession } from '@/features/auth/useSession';
import { RpcError, type RpcErrorCode } from '@/lib/rpcError';

import { regenerateHandle } from '../api';
import { HandleReveal } from '../components/HandleReveal';
import { myProfileKey } from '../hooks';
import { useOnboardingStore } from '../store/onboardingStore';

export function HandleScreen() {
  const { t } = useTranslation('profile');
  const { profile, userId } = useSession();
  const queryClient = useQueryClient();
  const finishHandleReveal = useOnboardingStore((state) => state.finishHandleReveal);
  const [error, setError] = useState<RpcErrorCode | null>(null);

  const change = async () => {
    try {
      await regenerateHandle();
      await queryClient.invalidateQueries({ queryKey: myProfileKey(userId ?? undefined) });
    } catch (caught) {
      setError(caught instanceof RpcError ? caught.code : 'UNKNOWN');
    }
  };

  const enter = () => {
    finishHandleReveal();
    router.replace('/map');
  };

  return (
    <Screen scroll>
      <AuthHeader step={t('handle.step')} title={t('handle.title')} body={t('handle.body')} />
      {profile ? <HandleReveal handle={profile.handle} /> : null}
      {error ? <Text color="error">{t(`errors:rpc.${error}`)}</Text> : null}
      {profile?.handleChangedAt === null ? (
        <Button label={t('handle.change')} variant="ghost" size="md" onPress={change} />
      ) : (
        <Text variant="body13" color="textSecondary">
          {t('handle.changedOnce')}
        </Text>
      )}
      <Button label={t('handle.enter')} onPress={enter} feedback="confirm" />
    </Screen>
  );
}
