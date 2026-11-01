import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { isSupportedLanguage } from '@/i18n/domain/pickLanguage';
import { track } from '@/lib/analytics';

import { signUp } from './api';
import type { AuthErrorCode } from './domain/authErrors';
import { isEmailValid } from './domain/email';
import { isPasswordValid } from './domain/password';
import { useCaptcha } from './useCaptcha';

export function useSignUpForm() {
  const { i18n } = useTranslation();
  const captcha = useCaptcha();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    track('signup_started');
    const locale = isSupportedLanguage(i18n?.language) ? i18n.language : 'it';
    const captchaToken = captcha.consume();
    const result = await signUp({ email: email.trim(), password, captchaToken, locale });
    setSubmitting(false);
    if (!result.ok) return setError(result.error);
    track('signup_completed');
    router.push({ pathname: '/verify-email', params: { email: email.trim() } });
  };

  return {
    fields: { email, setEmail, password, setPassword, consent, setConsent },
    captcha,
    error,
    submitting,
    canSubmit: isEmailValid(email) && isPasswordValid(password) && consent && captcha.ready,
    submit,
  };
}
