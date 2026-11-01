import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { PasswordField } from '@/components/ui/PasswordField';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { UiKitLink } from '@/features/dev/UiKitLink';

import { AuthLink, EmailField } from '../components/AuthFields';
import { AuthHeader } from '../components/AuthHeader';
import { CaptchaField } from '../components/CaptchaField';
import { PasswordStrengthMeter } from '../components/PasswordStrengthMeter';
import { useSignUpForm } from '../useSignUpForm';

// Main.dc.html: email + password + anti-bot + mandatory privacy consent.
export function SignUpScreen() {
  const { t } = useTranslation('auth');
  const { fields, captcha, error, submitting, canSubmit, submit } = useSignUpForm();
  return (
    <Screen scroll>
      <AuthHeader
        step={t('signUp.step')}
        brand={t('brand')}
        title={t('signUp.title')}
        body={t('signUp.body')}
      />
      <EmailField value={fields.email} onChangeText={fields.setEmail} />
      <PasswordField
        label={t('fields.password')}
        placeholder={t('fields.passwordPlaceholder')}
        value={fields.password}
        onChangeText={fields.setPassword}
        textContentType="newPassword"
      />
      <PasswordStrengthMeter password={fields.password} />
      <CaptchaField captcha={captcha} />
      <Checkbox label={t('signUp.consent')} checked={fields.consent} onChange={fields.setConsent} />
      <AuthLink href="/legal/privacy" label={t('signUp.readPolicy')} />
      {error ? <Text color="error">{t(`errors:auth.${error}`)}</Text> : null}
      <Button
        label={t('signUp.cta')}
        onPress={submit}
        disabled={!canSubmit}
        loading={submitting}
        feedback="confirm"
      />
      <AuthLink href="/sign-in" label={t('signUp.toSignIn')} />
      <UiKitLink />
    </Screen>
  );
}
