import { useEffect, useState } from 'react';

import { resendConfirmation } from './api';
import type { AuthErrorCode } from './domain/authErrors';
import { useCaptcha } from './useCaptcha';

const RESEND_COOLDOWN_S = 60;

// Client-side cooldown on top of Supabase's own email rate limit.
export function useResendConfirmation(email: string) {
  const captcha = useCaptcha();
  const [seconds, setSeconds] = useState(0);
  const [result, setResult] = useState<'sent' | AuthErrorCode | null>(null);

  useEffect(() => {
    if (seconds === 0) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const resend = async () => {
    setSeconds(RESEND_COOLDOWN_S);
    const outcome = await resendConfirmation(email, captcha.consume());
    setResult(outcome.ok ? 'sent' : outcome.error);
  };

  return {
    captcha,
    seconds,
    result,
    resend,
    canResend: email !== '' && seconds === 0 && captcha.ready,
  };
}
