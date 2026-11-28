import { endActiveUsageSession } from '@/features/usage/activeTracker';
import { useNotificationStore } from '@/features/notifications/store/notificationStore';
import { fakeSupabase } from '@/test/fakeSupabase';

import {
  exchangeAuthCode,
  resendConfirmation,
  sendPasswordReset,
  signIn,
  signOut,
  signUp,
  updatePassword,
} from './api';

jest.mock('@/features/usage/activeTracker', () => ({
  endActiveUsageSession: jest.fn(async () => undefined),
  setActiveTracker: jest.fn(),
}));

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

describe('signOut', () => {
  it('prima di uscire toglie il token push del dispositivo, poi chiude la sessione', async () => {
    useNotificationStore.getState().setPushToken('ExponentPushToken[abc]');
    await expect(signOut()).resolves.toEqual({ ok: true });
    const unregisterOrder = fakeSupabase.rpc.mock.invocationCallOrder[0];
    const signOutOrder = fakeSupabase.auth.signOut.mock.invocationCallOrder[0];
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('unregister_push_token', {
      p_token: 'ExponentPushToken[abc]',
    });
    expect(unregisterOrder).toBeLessThan(signOutOrder ?? 0);
  });
});

describe('registro degli accessi', () => {
  const loginCalls = () => fakeSupabase.rpc.mock.calls.filter(([name]) => name === 'log_login');

  it('un accesso riuscito registra un solo login con piattaforma e versione', async () => {
    await signIn(credentials);
    expect(loginCalls()).toEqual([['log_login', { p_platform: 'ios', p_app_version: null }]]);
  });

  it('un accesso fallito non registra nulla', async () => {
    fakeSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { name: 'AuthApiError', code: 'invalid_credentials' },
    });
    await signIn(credentials);
    expect(loginCalls()).toHaveLength(0);
  });

  it('lo scambio del codice di conferma email (crea la sessione) registra un login', async () => {
    await exchangeAuthCode('code-1');
    expect(loginCalls()).toHaveLength(1);
  });

  it('se il registro fallisce l’accesso riesce comunque', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    fakeSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'down' } });
    await expect(signIn(credentials)).resolves.toEqual({ ok: true });
  });

  it('il logout chiude prima la sessione di utilizzo', async () => {
    const order: string[] = [];
    fakeSupabase.auth.signOut.mockImplementationOnce(async () => {
      order.push('signOut');
      return { error: null };
    });
    jest.mocked(endActiveUsageSession).mockImplementationOnce(async () => {
      order.push('endUsage');
    });
    await signOut();
    expect(order).toEqual(['endUsage', 'signOut']);
  });
});
