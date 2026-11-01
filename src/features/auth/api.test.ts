import { fakeSupabase } from '@/test/fakeSupabase';

import {
  exchangeAuthCode,
  resendConfirmation,
  sendPasswordReset,
  signIn,
  signUp,
  updatePassword,
} from './api';

jest.mock('expo-linking', () => ({
  createURL: (path: string, options?: { queryParams?: Record<string, string> }) =>
    `rightplace://${path}${options?.queryParams ? `?next=${options.queryParams.next}` : ''}`,
}));

const credentials = {
  email: 'lince@example.com',
  password: 'Serata-2026',
  captchaToken: 'cf-token',
};

describe('auth api', () => {
  it('registra con token captcha, lingua e link di conferma verso l’app', async () => {
    await expect(signUp({ ...credentials, locale: 'en' })).resolves.toEqual({ ok: true });
    expect(fakeSupabase.auth.signUp).toHaveBeenCalledWith({
      email: 'lince@example.com',
      password: 'Serata-2026',
      options: {
        captchaToken: 'cf-token',
        data: { locale: 'en' },
        emailRedirectTo: 'rightplace://auth/callback',
      },
    });
  });

  it('traduce gli errori di Supabase in codici', async () => {
    fakeSupabase.auth.signUp.mockResolvedValueOnce({
      data: null,
      error: { name: 'AuthApiError', code: 'user_already_exists' },
    });
    await expect(signUp({ ...credentials, locale: 'it' })).resolves.toEqual({
      ok: false,
      error: 'EMAIL_TAKEN',
    });
  });

  it('riconosce gli errori di rete anche quando la chiamata lancia', async () => {
    fakeSupabase.auth.signInWithPassword.mockRejectedValueOnce(
      new TypeError('Network request failed'),
    );
    await expect(signIn(credentials)).resolves.toEqual({ ok: false, error: 'NETWORK' });
  });

  it('accede passando il token captcha', async () => {
    await signIn(credentials);
    expect(fakeSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'lince@example.com',
      password: 'Serata-2026',
      options: { captchaToken: 'cf-token' },
    });
  });

  it('omette il captcha quando Turnstile non è configurato', async () => {
    await signIn({ ...credentials, captchaToken: null });
    expect(fakeSupabase.auth.signInWithPassword).toHaveBeenCalledWith(
      expect.objectContaining({ options: { captchaToken: undefined } }),
    );
  });

  it('reinvia la conferma e manda il reset password con il deep link giusto', async () => {
    await resendConfirmation('lince@example.com', null);
    expect(fakeSupabase.auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'lince@example.com',
      options: { emailRedirectTo: 'rightplace://auth/callback', captchaToken: undefined },
    });
    await sendPasswordReset('lince@example.com', 'cf');
    expect(fakeSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('lince@example.com', {
      redirectTo: 'rightplace://auth/callback?next=reset-password',
      captchaToken: 'cf',
    });
  });

  it('cambia la password e scambia il codice del link email', async () => {
    await expect(updatePassword('Nuova-password-1')).resolves.toEqual({ ok: true });
    expect(fakeSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'Nuova-password-1' });
    await expect(exchangeAuthCode('abc')).resolves.toEqual({ ok: true });
    expect(fakeSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc');
  });
});
