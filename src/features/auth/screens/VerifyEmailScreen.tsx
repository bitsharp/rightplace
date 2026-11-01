import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

import { signOut } from '../api';
import { AuthLink } from '../components/AuthFields';
import { AuthHeader } from '../components/AuthHeader';
import { CaptchaField } from '../components/CaptchaField';
import { useAuthStore } from '../store/authStore';
import { useResendConfirmation } from '../useResendConfirmation';

export function VerifyEmailScreen() {
  const { t } = useTranslation('auth');
  const params = useLocalSearchParams<{ email?: string }>();
  const sessionEmail = useAuthStore((state) => state.session?.email);
  const email = params.email ?? sessionEmail ?? '';
  const { captcha, seconds, result, resend, canResend } = useResendConfirmation(email);
  const resendLabel = seconds > 0 ? t('verify.resendIn', { seconds }) : t('verify.resend');
  return (
    <Screen scroll>
      <AuthHeader step={t('verify.step')} title={t('verify.title')} body={t('verify.body')} />
      <Card>
        <Text variant="body16Strong">{email}</Text>
      </Card>
      <CaptchaField captcha={captcha} />
      {result === 'sent' ? <Text color="secondary">{t('verify.sent')}</Text> : null}
      {result && result !== 'sent' ? <Text color="error">{t(`errors:auth.${result}`)}</Text> : null}
      <Button label={resendLabel} variant="secondary" onPress={resend} disabled={!canResend} />
      {sessionEmail ? (
        <Button
          label={t('verify.signOut')}
          variant="ghost"
          size="md"
          onPress={() => void signOut()}
        />
      ) : (
        <AuthLink href="/sign-in" label={t('verify.toSignIn')} />
      )}
    </Screen>
  );
}
