import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { useOnboardingStore } from '@/features/profile/store/onboardingStore';
import { renderApp } from '@/test/appFlows';
import { fakeProfileRow, fakeSupabase, setFakeTable } from '@/test/fakeSupabase';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
}));

async function fillProfile(year: string) {
  await fireEvent.changeText(await screen.findByLabelText('profile:form.day'), '10');
  await fireEvent.changeText(screen.getByLabelText('profile:form.month'), '5');
  await fireEvent.changeText(screen.getByLabelText('profile:form.year'), year);
  await fireEvent.press(screen.getByRole('button', { name: 'profile:form.gender.other' }));
}

describe('profilo privato e handle', () => {
  it('completa il profilo, mostra l’handle e poi entra nella mappa', async () => {
    fakeSupabase.rpc.mockImplementation(async (name: string) => {
      if (name === 'complete_profile')
        setFakeTable('profiles', [fakeProfileRow({ gender: 'other' })]);
      return { data: null, error: null };
    });
    await renderApp('needsProfile');
    await fillProfile('2000');
    await fireEvent.press(screen.getByRole('button', { name: 'profile:setup.cta' }));
    expect(fakeSupabase.rpc).toHaveBeenCalledWith(
      'complete_profile',
      expect.objectContaining({ p_gender: 'other' }),
    );
    expect(await screen.findByText('@lince.rosso')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'profile:handle.enter' }));
    expect(await screen.findByRole('header', { name: 'map:title' })).toBeOnTheScreen();
  });

  it('a 17 anni blocca il profilo e propone di uscire', async () => {
    await renderApp('needsProfile');
    await fillProfile(String(new Date().getFullYear() - 17));
    expect(screen.getByText('profile:form.underage')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'profile:setup.signOut' }));
    expect(fakeSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('l’handle si può cambiare una sola volta', async () => {
    fakeSupabase.rpc.mockImplementation(async (name: string) => {
      if (name !== 'regenerate_handle') return { data: null, error: null };
      setFakeTable('profiles', [
        fakeProfileRow({ handle: 'volpe.oro', handle_changed_at: '2026-11-01T10:00:00Z' }),
      ]);
      return { data: 'volpe.oro', error: null };
    });
    useOnboardingStore.setState({ pendingHandleReveal: true });
    await renderApp('ready', '/handle');
    await fireEvent.press(await screen.findByRole('button', { name: 'profile:handle.change' }));
    expect(await screen.findByText('@volpe.oro')).toBeOnTheScreen();
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'profile:handle.change' })).not.toBeOnTheScreen(),
    );
  });
});

describe('tab Profilo', () => {
  it('mostra l’email solo in lettura e permette di uscire', async () => {
    await renderApp('ready', '/profile');
    expect(await screen.findByText('lince@example.com')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'profile:account.signOut' }));
    expect(await screen.findByRole('header', { name: 'auth:signUp.title' })).toBeOnTheScreen();
  });

  it('salva le modifiche del profilo', async () => {
    await renderApp('ready', '/profile');
    await fireEvent.press(await screen.findByRole('button', { name: 'profile:form.gender.male' }));
    await fireEvent.press(screen.getByRole('button', { name: 'profile:app.save' }));
    expect(fakeSupabase.rpc).toHaveBeenCalledWith(
      'complete_profile',
      expect.objectContaining({ p_gender: 'male' }),
    );
    expect(await screen.findByText('profile:app.saved')).toBeOnTheScreen();
  });

  it('cambia lingua salvandola subito sul profilo', async () => {
    await renderApp('ready', '/profile');
    await fireEvent.press(await screen.findByRole('button', { name: 'profile:form.language.en' }));
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('set_locale', { p_locale: 'en' });
  });

  it('elimina l’account solo dopo una doppia conferma', async () => {
    await renderApp('ready', '/profile');
    await fireEvent.press(await screen.findByRole('button', { name: 'profile:account.delete' }));
    expect(fakeSupabase.rpc).not.toHaveBeenCalledWith('delete_my_account', undefined);
    await fireEvent.press(screen.getByRole('button', { name: 'profile:delete.continue' }));
    expect(fakeSupabase.rpc).not.toHaveBeenCalledWith('delete_my_account', undefined);
    await fireEvent.press(screen.getByRole('button', { name: 'profile:delete.confirm' }));
    await waitFor(() =>
      expect(fakeSupabase.rpc).toHaveBeenCalledWith('delete_my_account', undefined),
    );
    expect(fakeSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('mostra il link al profilo creator solo ai creator', async () => {
    await renderApp('ready', '/profile', { is_creator: true });
    expect(await screen.findByText('profile:app.creatorProfile')).toBeOnTheScreen();
  });
});
