import type { Language } from '@/i18n/domain/pickLanguage';
import { authCallbackUrl } from '@/lib/deepLinks';
import { supabase } from '@/lib/supabase';

import { toAuthErrorCode, type AuthErrorCode } from './domain/authErrors';

export type AuthOutcome = { ok: true } | { ok: false; error: AuthErrorCode };

type Credentials = { email: string; password: string; captchaToken: string | null };

async function outcome(call: () => PromiseLike<{ error: unknown }>): Promise<AuthOutcome> {
  try {
    const { error } = await call();
    return error ? { ok: false, error: toAuthErrorCode(error) } : { ok: true };
  } catch (thrown) {
    return { ok: false, error: toAuthErrorCode(thrown) };
  }
}

const captcha = (token: string | null) => token ?? undefined;

export function signUp({
  email,
  password,
  captchaToken,
  locale,
}: Credentials & { locale: Language }) {
  return outcome(() =>
    supabase.auth.signUp({
      email,
      password,
      // locale reaches profiles.locale via the sign-up trigger, so the confirmation email is localised
      options: {
        captchaToken: captcha(captchaToken),
        data: { locale },
        emailRedirectTo: authCallbackUrl(),
      },
    }),
  );
}

export function signIn({ email, password, captchaToken }: Credentials) {
  return outcome(() =>
    supabase.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken: captcha(captchaToken) },
    }),
  );
}

export function signOut() {
  return outcome(() => supabase.auth.signOut());
}

export function resendConfirmation(email: string, captchaToken: string | null) {
  return outcome(() =>
    supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: authCallbackUrl(), captchaToken: captcha(captchaToken) },
    }),
  );
}

export function sendPasswordReset(email: string, captchaToken: string | null) {
  return outcome(() =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authCallbackUrl('reset-password'),
      captchaToken: captcha(captchaToken),
    }),
  );
}

export function updatePassword(password: string) {
  return outcome(() => supabase.auth.updateUser({ password }));
}

export function exchangeAuthCode(code: string) {
  return outcome(() => supabase.auth.exchangeCodeForSession(code));
}
