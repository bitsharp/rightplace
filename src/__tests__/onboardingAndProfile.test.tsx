import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { act } from 'react';

import { renderApp } from '@/test/appFlows';
import { fakeProfileRow, fakeSupabase, setFakeTable } from '@/test/fakeSupabase';

// Creator area on: these flows cover it; the flag-off behaviour is in creatorFlagOff.test.tsx.
process.env.EXPO_PUBLIC_CREATOR_ENABLED = 'true';

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

const FIELD = 'profile:handleEditor.label';
const SAVE = 'profile:handleEditor.save';
const RANDOM = 'profile:handleEditor.random';

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
});
afterEach(() => jest.useRealTimers());

describe('profilo privato e handle', () => {
  it('completa il profilo, mostra l’handle e poi entra nella mappa', async () => {
    fakeSupabase.rpc.mockImplementation(async (name: string) => {
      if (name === 'complete_profile')
        setFakeTable('profiles', [fakeProfileRow({ gender: 'other', handle_confirmed_at: null })]);
      if (name === 'confirm_handle')
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
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('confirm_handle', undefined);
    expect(await screen.findByRole('button', { name: 'map:view.general' })).toBeOnTheScreen();
  });

  it('a 17 anni blocca il profilo e propone di uscire', async () => {
    await renderApp('needsProfile');
    await fillProfile(String(new Date().getFullYear() - 17));
    expect(screen.getByText('profile:form.underage')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'profile:setup.signOut' }));
    expect(fakeSupabase.auth.signOut).toHaveBeenCalled();
  });

  it('nello step @tag si sceglie un @tag proprio e poi si entra', async () => {
    fakeSupabase.rpc.mockImplementation(async (name: string) => {
      if (name === 'is_handle_available') return { data: 'available', error: null };
      if (name === 'set_handle')
        setFakeTable('profiles', [
          fakeProfileRow({ handle: 'luca_97', handle_confirmed_at: null }),
        ]);
      if (name === 'confirm_handle')
        setFakeTable('profiles', [fakeProfileRow({ handle: 'luca_97' })]);
      return { data: name === 'set_handle' ? 'luca_97' : null, error: null };
    });
    await renderApp('needsHandle', '/handle');
    await fireEvent.changeText(await screen.findByLabelText(FIELD), 'Luca_97');
    await act(async () => jest.advanceTimersByTime(400));
    expect(await screen.findByText('profile:handleEditor.status.available')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: SAVE }));
    await waitFor(() =>
      expect(fakeSupabase.rpc).toHaveBeenCalledWith('set_handle', { p_handle: 'luca_97' }),
    );
    expect((await screen.findAllByText('@luca_97')).length).toBeGreaterThan(0);
    await fireEvent.press(screen.getByRole('button', { name: 'profile:handle.enter' }));
    expect(await screen.findByRole('button', { name: 'map:view.general' })).toBeOnTheScreen();
  });

  it('nello step @tag si può estrarne uno a caso, quante volte si vuole, senza limite mostrato', async () => {
    let drawn = 0;
    fakeSupabase.rpc.mockImplementation(async (name: string) => {
      if (name !== 'regenerate_handle') return { data: null, error: null };
      drawn += 1;
      const handle = `volpe.oro${drawn}`;
      setFakeTable('profiles', [fakeProfileRow({ handle, handle_confirmed_at: null })]);
      return { data: handle, error: null };
    });
    await renderApp('needsHandle', '/handle');
    await fireEvent.press(await screen.findByRole('button', { name: RANDOM }));
    expect((await screen.findAllByText('@volpe.oro1')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: RANDOM })).toBeEnabled();
    await fireEvent.press(screen.getByRole('button', { name: RANDOM }));
    expect((await screen.findAllByText('@volpe.oro2')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: RANDOM })).toBeEnabled();
    expect(screen.queryByText('profile:handleEditor.limit')).toBeNull();
    expect(screen.queryByText(/profile:handleEditor\.nextChange/)).toBeNull();
    expect(screen.getByText('profile:handle.freeUntilContinue')).toBeOnTheScreen();
  });

  it('se la conferma del @tag fallisce resta sullo step e mostra l’errore tradotto', async () => {
    fakeSupabase.rpc.mockImplementation(async (name: string) =>
      name === 'confirm_handle'
        ? { data: null, error: { message: 'NETWORK' } }
        : { data: null, error: null },
    );
    await renderApp('needsHandle', '/handle');
    await fireEvent.press(await screen.findByRole('button', { name: 'profile:handle.enter' }));
    expect(await screen.findByText(/^errors:rpc\./)).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'map:view.general' })).toBeNull();
  });
});

describe('tab Profilo: scelta del @tag', () => {
  it('mostra il @tag, l’avviso su nome e cognome e il limite di 30 giorni', async () => {
    await renderApp('ready', '/profile');
    expect((await screen.findAllByText('@lince.rosso')).length).toBeGreaterThan(0);
    expect(screen.getByText('profile:handleEditor.warning')).toBeOnTheScreen();
    expect(screen.getByText('profile:handleEditor.limit')).toBeOnTheScreen();
    expect(screen.getByLabelText(FIELD).props.value).toBe('lince.rosso');
  });

  it('normalizza mentre si scrive e segnala subito un formato sbagliato', async () => {
    await renderApp('ready', '/profile');
    const field = await screen.findByLabelText(FIELD);
    await fireEvent.changeText(field, ' @Luca ');
    expect(screen.getByLabelText(FIELD).props.value).toBe('luca');
    await fireEvent.changeText(field, '1luca');
    expect(await screen.findByText('profile:handleEditor.format.badStart')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: SAVE })).toBeDisabled();
    expect(fakeSupabase.rpc).not.toHaveBeenCalledWith('is_handle_available', expect.anything());
  });

  it('controlla la disponibilità dopo 400 ms e non permette di salvare un @tag occupato', async () => {
    fakeSupabase.rpc.mockImplementation(async (name: string) => ({
      data: name === 'is_handle_available' ? 'taken' : null,
      error: null,
    }));
    await renderApp('ready', '/profile');
    await fireEvent.changeText(await screen.findByLabelText(FIELD), 'volpe.blu');
    expect(await screen.findByText('profile:handleEditor.status.checking')).toBeOnTheScreen();
    await act(async () => jest.advanceTimersByTime(400));
    expect(await screen.findByText('profile:handleEditor.status.taken')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: SAVE })).toBeDisabled();
  });

  it('mostra l’errore tradotto se il server rifiuta il salvataggio', async () => {
    fakeSupabase.rpc.mockImplementation(async (name: string) => {
      if (name === 'is_handle_available') return { data: 'available', error: null };
      if (name === 'set_handle') return { data: null, error: { message: 'HANDLE_NOT_ALLOWED' } };
      return { data: null, error: null };
    });
    await renderApp('ready', '/profile');
    await fireEvent.changeText(await screen.findByLabelText(FIELD), 'luca_97');
    await act(async () => jest.advanceTimersByTime(400));
    expect(await screen.findByText('profile:handleEditor.status.available')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: SAVE }));
    expect(await screen.findByText('errors:rpc.HANDLE_NOT_ALLOWED')).toBeOnTheScreen();
  });

  it('se il limite è attivo blocca la modifica e indica quando si potrà rifare', async () => {
    const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    await renderApp('ready', '/profile', { handle_changed_at: recent });
    expect(
      await screen.findByText(/^profile:handleEditor\.nextChange\(\{"date":"[^"]+"\}\)$/),
    ).toBeOnTheScreen();
    expect(screen.queryByText('profile:handleEditor.limit')).toBeNull();
    expect(screen.getByRole('button', { name: SAVE })).toBeDisabled();
    expect(screen.getByRole('button', { name: RANDOM })).toBeDisabled();
  });

  it('dopo 30 giorni si può cambiare di nuovo', async () => {
    const old = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    await renderApp('ready', '/profile', { handle_changed_at: old });
    expect(await screen.findByText('profile:handleEditor.limit')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: RANDOM })).toBeEnabled();
  });

  it('"Generane uno a caso" estrae un @tag e lo mostra subito', async () => {
    fakeSupabase.rpc.mockImplementation(async (name: string) => {
      if (name !== 'regenerate_handle') return { data: null, error: null };
      setFakeTable('profiles', [
        fakeProfileRow({ handle: 'volpe.oro', handle_changed_at: new Date().toISOString() }),
      ]);
      return { data: 'volpe.oro', error: null };
    });
    await renderApp('ready', '/profile');
    await fireEvent.press(await screen.findByRole('button', { name: RANDOM }));
    expect((await screen.findAllByText('@volpe.oro')).length).toBeGreaterThan(0);
    expect(await screen.findByText(/profile:handleEditor\.nextChange/)).toBeOnTheScreen();
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
