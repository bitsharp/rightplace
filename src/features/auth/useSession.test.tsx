import { renderHook, waitFor } from '@testing-library/react-native';

import { fakeProfileRow, setFakeTable } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { useAuthStore } from './store/authStore';
import { useSession } from './useSession';

const signedIn = (emailConfirmed = true) =>
  useAuthStore.setState({
    initialized: true,
    session: { userId: 'user-1', email: 'lince@example.com', emailConfirmed },
  });

async function statusOf() {
  const { Wrapper } = createQueryWrapper();
  const { result } = await renderHook(() => useSession(), { wrapper: Wrapper });
  return result;
}

describe('useSession', () => {
  it('è loading prima di leggere la sessione', async () => {
    useAuthStore.setState({ initialized: false, session: null });
    expect((await statusOf()).current.status).toBe('loading');
  });

  it('è signedOut senza sessione', async () => {
    useAuthStore.setState({ initialized: true, session: null });
    expect((await statusOf()).current.status).toBe('signedOut');
  });

  it('è unverified con email da confermare', async () => {
    signedIn(false);
    expect((await statusOf()).current.status).toBe('unverified');
  });

  it('è needsProfile finché mancano età e genere', async () => {
    signedIn();
    setFakeTable('profiles', [fakeProfileRow({ birth_date: null, gender: null })]);
    const result = await statusOf();
    await waitFor(() => expect(result.current.status).toBe('needsProfile'));
  });

  it('è ready con il profilo completo ed espone handle ed email', async () => {
    signedIn();
    setFakeTable('profiles', [fakeProfileRow()]);
    const result = await statusOf();
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.profile?.handle).toBe('lince.rosso');
    expect(result.current.email).toBe('lince@example.com');
  });

  it('segnala l’errore di caricamento del profilo invece di restare bloccato', async () => {
    signedIn();
    const { fakeSupabase } =
      jest.requireActual<typeof import('@/test/fakeSupabase')>('@/test/fakeSupabase');
    fakeSupabase.from.mockImplementationOnce(() => {
      throw new TypeError('Network request failed');
    });
    const result = await statusOf();
    await waitFor(() => expect(result.current.profileError).toBe(true));
    expect(result.current.status).toBe('loading');
  });
});
