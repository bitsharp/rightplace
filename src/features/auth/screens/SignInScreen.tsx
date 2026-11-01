import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { PasswordField } from '@/components/ui/PasswordField';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';

import { AuthLink, EmailField } from '../components/AuthFields';
import { AuthHeader } from '../components/AuthHeader';
import { CaptchaField } from '../components/CaptchaField';
import { useSignInForm } from '../useSignInForm';

export function SignInScreen() {
  const { t } = useTranslation('auth');
  const form = useSignInForm();
  const { fields, notice } = form;
  return (
    <Screen scroll>
      <AuthHeader step={t('signIn.step')} brand={t('brand')} title={t('signIn.title')} />
      <EmailField value={fields.email} onChangeText={fields.setEmail} />
      <PasswordField
        label={t('fields.password')}
        value={fields.password}
        onChangeText={fields.setPassword}
      />
      <CaptchaField captcha={form.captcha} />
      {notice?.kind === 'error' ? (
        <Text color="error">{t(`errors:auth.${notice.code}`)}</Text>
      ) : null}
      {notice?.kind === 'resetSent' ? <Text color="secondary">{t('signIn.resetSent')}</Text> : null}
      <Button
        label={t('signIn.cta')}
        onPress={form.submit}
        disabled={!form.canSubmit}
        loading={form.submitting}
      />
      <Button
        label={t('signIn.forgot')}
        variant="ghost"
        size="md"
        onPress={form.forgot}
        disabled={!form.canReset}
      />
      <AuthLink href="/sign-up" label={t('signIn.toSignUp')} />
    </Screen>
  );
}
