import { fireEvent, screen } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import path from 'path';

import { useAuthStore } from '@/features/auth/store/authStore';

import { fakeProfileRow, fakeUserSession, setFakeSession, setFakeTable } from './fakeSupabase';

export const APP_DIR = path.join(__dirname, '..', '..', 'app');

type AppState = 'signedOut' | 'unverified' | 'needsProfile' | 'ready';

// Puts the fake backend in a given session state, then renders the real router.
export async function renderApp(
  state: AppState,
  initialUrl = '/',
  profile: Record<string, unknown> = {},
) {
  useAuthStore.setState({ initialized: false, session: null });
  if (state !== 'signedOut') {
    setFakeSession(fakeUserSession(state === 'unverified' ? { email_confirmed_at: null } : {}));
  }
  if (state === 'needsProfile')
    setFakeTable('profiles', [fakeProfileRow({ birth_date: null, gender: null })]);
  if (state === 'ready') setFakeTable('profiles', [fakeProfileRow(profile)]);
  return renderRouter(APP_DIR, { initialUrl });
}

export async function sendCaptchaToken(token = 'cf-token') {
  await fireEvent(screen.getByTestId('turnstile-webview'), 'message', {
    nativeEvent: { data: JSON.stringify({ type: 'token', token }) },
  });
}
