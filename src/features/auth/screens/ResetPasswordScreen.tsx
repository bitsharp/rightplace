import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { PasswordField } from '@/components/ui/PasswordField';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

import { updatePassword } from '../api';
import { AuthHeader } from '../components/AuthHeader';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import type { AuthErrorCode } from '../domain/authErrors';
import { isPasswordValid } from '../domain/password';

// Used after a reset link and from Profile → "Cambia password" (both need a session).
export function ResetPasswordScreen() {
  const { t } = useTranslation('auth');
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'done' | AuthErrorCode>('idle');

  const save = async () => {
    setState('saving');
    const result = await updatePassword(password);
    setState(result.ok ? 'done' : result.error);
  };

  const error = state !== 'idle' && state !== 'saving' && state !== 'done' ? state : null;
  return (
    <Screen scroll>
      <AuthHeader step={t('reset.step')} title={t('reset.title')} />
      <PasswordField
        label={t('fields.newPassword')}
        value={password}
        onChangeText={setPassword}
        textContentType="newPassword"
      />
      <PasswordStrengthMeter password={password} />
      {error ? <Text color="error">{t(`errors:auth.${error}`)}</Text> : null}
      {state === 'done' ? (
        <>
          <Text color="secondary">{t('reset.done')}</Text>
          <Button label={t('reset.continue')} onPress={() => router.replace('/')} />
        </>
      ) : (
        <Button
          label={t('reset.cta')}
          onPress={save}
          disabled={!isPasswordValid(password)}
          loading={state === 'saving'}
        />
      )}
    </Screen>
  );
}
