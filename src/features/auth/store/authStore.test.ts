import { renderHook, waitFor } from '@testing-library/react-native';
import { act } from 'react';

import { fakeUserSession, setFakeSession } from '@/test/fakeSupabase';

import { toAuthSession, useAuthListener, useAuthStore } from './authStore';

describe('toAuthSession', () => {
  it('tiene solo id, email e conferma email', () => {
    expect(toAuthSession(fakeUserSession({ email_confirmed_at: null }))).toEqual({
      userId: 'user-1',
      email: 'lince@example.com',
      emailConfirmed: false,
    });
  });
});

describe('useAuthListener', () => {
  beforeEach(() => useAuthStore.setState({ initialized: false, session: null }));

  it('legge la sessione salvata all’avvio', async () => {
    setFakeSession(fakeUserSession());
    await renderHook(() => useAuthListener());
    await waitFor(() => expect(useAuthStore.getState().initialized).toBe(true));
    expect(useAuthStore.getState().session?.userId).toBe('user-1');
  });

  it('segue login e logout', async () => {
    await renderHook(() => useAuthListener());
    await waitFor(() => expect(useAuthStore.getState().initialized).toBe(true));
    expect(useAuthStore.getState().session).toBeNull();
    await act(async () => setFakeSession(fakeUserSession()));
    expect(useAuthStore.getState().session?.emailConfirmed).toBe(true);
    await act(async () => setFakeSession(null, 'SIGNED_OUT'));
    expect(useAuthStore.getState().session).toBeNull();
  });
});
