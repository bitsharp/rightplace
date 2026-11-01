import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderApp, sendCaptchaToken } from '@/test/appFlows';
import {
  fakeSupabase,
  fakeUserSession,
  setFakeSession,
  setFakeTable,
  fakeProfileRow,
} from '@/test/fakeSupabase';

async function fillSignUp() {
  await fireEvent.changeText(
    await screen.findByLabelText('auth:fields.email'),
    'lince@example.com',
  );
  await fireEvent.changeText(screen.getByLabelText('auth:fields.password'), 'Serata-Navigli-2026');
  await sendCaptchaToken();
}

describe('registrazione', () => {
  it('senza consenso privacy il CTA resta disabilitato', async () => {
    await renderApp('signedOut', '/sign-up');
    await fillSignUp();
    expect(screen.getByRole('button', { name: 'auth:signUp.cta' })).toBeDisabled();
  });

  it('senza verifica anti-bot il CTA resta disabilitato', async () => {
    await renderApp('signedOut', '/sign-up');
    await fireEvent.changeText(
      await screen.findByLabelText('auth:fields.email'),
      'lince@example.com',
    );
    await fireEvent.changeText(
      screen.getByLabelText('auth:fields.password'),
      'Serata-Navigli-2026',
    );
    await fireEvent.press(screen.getByRole('checkbox', { name: 'auth:signUp.consent' }));
    expect(screen.getByRole('button', { name: 'auth:signUp.cta' })).toBeDisabled();
  });

  it('crea l’account con il token anti-bot e chiede di confermare l’email', async () => {
    await renderApp('signedOut', '/sign-up');
    await fillSignUp();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'auth:signUp.consent' }));
    await fireEvent.press(screen.getByRole('button', { name: 'auth:signUp.cta' }));
    expect(fakeSupabase.auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'lince@example.com',
        options: expect.objectContaining({ captchaToken: 'cf-token' }),
      }),
    );
    expect(await screen.findByRole('header', { name: 'auth:verify.title' })).toBeOnTheScreen();
    expect(screen.getByText('lince@example.com')).toBeOnTheScreen();
  });

  it('spiega in modo umano un’email già registrata', async () => {
    fakeSupabase.auth.signUp.mockResolvedValueOnce({
      data: null,
      error: { code: 'user_already_exists' },
    });
    await renderApp('signedOut', '/sign-up');
    await fillSignUp();
    await fireEvent.press(screen.getByRole('checkbox', { name: 'auth:signUp.consent' }));
    await fireEvent.press(screen.getByRole('button', { name: 'auth:signUp.cta' }));
    expect(await screen.findByText('errors:auth.EMAIL_TAKEN')).toBeOnTheScreen();
  });
});

describe('accesso', () => {
  it('con credenziali errate mostra l’errore', async () => {
    fakeSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: null,
      error: { code: 'invalid_credentials' },
    });
    await renderApp('signedOut', '/sign-in');
    await fireEvent.changeText(
      await screen.findByLabelText('auth:fields.email'),
      'lince@example.com',
    );
    await fireEvent.changeText(screen.getByLabelText('auth:fields.password'), 'sbagliata1');
    await sendCaptchaToken();
    await fireEvent.press(screen.getByRole('button', { name: 'auth:signIn.cta' }));
    expect(await screen.findByText('errors:auth.INVALID_CREDENTIALS')).toBeOnTheScreen();
  });

  it('con credenziali giuste entra nell’app', async () => {
    fakeSupabase.auth.signInWithPassword.mockImplementationOnce(async () => {
      setFakeTable('profiles', [fakeProfileRow()]);
      setFakeSession(fakeUserSession());
      return { data: {}, error: null };
    });
    await renderApp('signedOut', '/sign-in');
    await fireEvent.changeText(
      await screen.findByLabelText('auth:fields.email'),
      'lince@example.com',
    );
    await fireEvent.changeText(
      screen.getByLabelText('auth:fields.password'),
      'Serata-Navigli-2026',
    );
    await sendCaptchaToken();
    await fireEvent.press(screen.getByRole('button', { name: 'auth:signIn.cta' }));
    expect(await screen.findByRole('header', { name: 'map:title' })).toBeOnTheScreen();
  });

  it('manda il link per reimpostare la password', async () => {
    await renderApp('signedOut', '/sign-in');
    await fireEvent.changeText(
      await screen.findByLabelText('auth:fields.email'),
      'lince@example.com',
    );
    await sendCaptchaToken();
    await fireEvent.press(screen.getByRole('button', { name: 'auth:signIn.forgot' }));
    expect(fakeSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'lince@example.com',
      expect.anything(),
    );
    expect(await screen.findByText('auth:signIn.resetSent')).toBeOnTheScreen();
  });
});

describe('link dalle email', () => {
  it('scambia il codice e porta al profilo', async () => {
    fakeSupabase.auth.exchangeCodeForSession.mockImplementationOnce(async () => {
      setFakeTable('profiles', [fakeProfileRow({ birth_date: null, gender: null })]);
      setFakeSession(fakeUserSession());
      return { data: {}, error: null };
    });
    await renderApp('signedOut', '/auth/callback?code=abc');
    await waitFor(() =>
      expect(fakeSupabase.auth.exchangeCodeForSession).toHaveBeenCalledWith('abc'),
    );
    expect(await screen.findByRole('header', { name: 'profile:setup.title' })).toBeOnTheScreen();
  });

  it('dal link di reset apre il cambio password', async () => {
    fakeSupabase.auth.exchangeCodeForSession.mockImplementationOnce(async () => {
      setFakeTable('profiles', [fakeProfileRow()]);
      setFakeSession(fakeUserSession());
      return { data: {}, error: null };
    });
    await renderApp('signedOut', '/auth/callback?code=abc&next=reset-password');
    expect(await screen.findByRole('header', { name: 'auth:reset.title' })).toBeOnTheScreen();
    await fireEvent.changeText(
      screen.getByLabelText('auth:fields.newPassword'),
      'Nuova-Password-2026',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'auth:reset.cta' }));
    expect(fakeSupabase.auth.updateUser).toHaveBeenCalledWith({ password: 'Nuova-Password-2026' });
  });

  it('con un link scaduto lo dice e propone di accedere', async () => {
    await renderApp('signedOut', '/auth/callback?error_description=expired');
    expect(await screen.findByText('auth:callback.failed')).toBeOnTheScreen();
  });
});
