import { router } from 'expo-router';
import { useState } from 'react';

import { sendPasswordReset, signIn } from './api';
import type { AuthErrorCode } from './domain/authErrors';
import { isEmailValid } from './domain/email';
import { useCaptcha } from './useCaptcha';

export type SignInNotice = { kind: 'error'; code: AuthErrorCode } | { kind: 'resetSent' } | null;

export function useSignInForm() {
  const captcha = useCaptcha();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState<SignInNotice>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    const result = await signIn({ email: email.trim(), password, captchaToken: captcha.consume() });
    setSubmitting(false);
    if (result.ok) return; // the auth listener moves the app on
    if (result.error === 'EMAIL_NOT_CONFIRMED') {
      return router.push({ pathname: '/verify-email', params: { email: email.trim() } });
    }
    setNotice({ kind: 'error', code: result.error });
  };

  const forgot = async () => {
    const result = await sendPasswordReset(email.trim(), captcha.consume());
    setNotice(result.ok ? { kind: 'resetSent' } : { kind: 'error', code: result.error });
  };

  const emailOk = isEmailValid(email);
  return {
    fields: { email, setEmail, password, setPassword },
    captcha,
    notice,
    submitting,
    canSubmit: emailOk && password.length > 0 && captcha.ready,
    canReset: emailOk && captcha.ready,
    submit,
    forgot,
  };
}
