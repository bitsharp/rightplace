import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { colors } from '@/theme/tokens';

import { exchangeAuthCode } from '../api';

type Params = { code?: string; next?: string; error_description?: string };

// Landing route for email links (confirm sign-up, reset password): rightplace://auth/callback?code=…
export function AuthCallbackScreen() {
  const { t } = useTranslation('auth');
  const { code, next } = useLocalSearchParams<Params>();
  const [failed, setFailed] = useState(!code);

  useEffect(() => {
    if (!code) return;
    exchangeAuthCode(code).then((result) => {
      if (!result.ok) return setFailed(true);
      router.replace(next === 'reset-password' ? '/reset-password' : '/');
    });
  }, [code, next]);

  return (
    <Screen>
      {failed ? (
        <>
          <Text accessibilityRole="header" variant="display24">
            {t('callback.title')}
          </Text>
          <Text color="textSecondary">{t('callback.failed')}</Text>
          <Button label={t('callback.toSignIn')} onPress={() => router.replace('/')} />
        </>
      ) : (
        <ActivityIndicator color={colors.primary} accessibilityLabel={t('callback.loading')} />
      )}
    </Screen>
  );
}
