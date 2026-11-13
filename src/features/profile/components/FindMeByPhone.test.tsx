import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { fakeSupabase } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { FindMeByPhone } from './FindMeByPhone';

jest.mock('@/features/friends/useDefaultCountry', () => ({ useDefaultCountry: () => 'IT' }));
jest.mock('@/features/friends/digest', () => ({ sha256: async () => 'a'.repeat(64) }));

// The "server" lives outside the component, like the real one: a new mount asks it again.
async function renderWith(registered: boolean) {
  const server = { registered };
  fakeSupabase.rpc.mockImplementation(async (name: string) => {
    if (name === 'set_my_phone_hash') server.registered = true;
    if (name === 'clear_my_phone_hash') server.registered = false;
    return { data: name === 'has_phone_hash' ? server.registered : null, error: null };
  });
  const { Wrapper } = createQueryWrapper();
  await render(<FindMeByPhone />, { wrapper: Wrapper });
  return server;
}

describe('FindMeByPhone', () => {
  it('senza numero registrato mostra il campo e Salva, non Rimuovi', async () => {
    await renderWith(false);
    expect(await screen.findByLabelText('profile:findMe.label')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'profile:findMe.save' })).toBeOnTheScreen();
    expect(screen.queryByText('profile:findMe.registered')).toBeNull();
    expect(screen.queryByRole('button', { name: 'profile:findMe.remove' })).toBeNull();
  });

  it('con numero registrato mostra "Numero registrato" e Rimuovi, senza campo', async () => {
    await renderWith(true);
    expect(await screen.findByText('profile:findMe.registered')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'profile:findMe.remove' })).toBeOnTheScreen();
    expect(screen.queryByLabelText('profile:findMe.label')).toBeNull();
    expect(screen.queryByRole('button', { name: 'profile:findMe.save' })).toBeNull();
  });

  it('Rimuovi toglie l’hash e riporta il campo', async () => {
    await renderWith(true);
    await fireEvent.press(await screen.findByRole('button', { name: 'profile:findMe.remove' }));
    await waitFor(() =>
      expect(fakeSupabase.rpc.mock.calls.some(([name]) => name === 'clear_my_phone_hash')).toBe(
        true,
      ),
    );
    expect(await screen.findByLabelText('profile:findMe.label')).toBeOnTheScreen();
    expect(screen.queryByText('profile:findMe.registered')).toBeNull();
  });

  it('riaprendo la schermata il numero salvato risulta ancora registrato', async () => {
    await renderWith(false);
    await fireEvent.changeText(
      await screen.findByLabelText('profile:findMe.label'),
      '345 123 4567',
    );
    await fireEvent.press(screen.getByRole('button', { name: 'profile:findMe.save' }));
    expect(await screen.findByText('profile:findMe.registered')).toBeOnTheScreen();
    await screen.unmount();

    const { Wrapper } = createQueryWrapper();
    await render(<FindMeByPhone />, { wrapper: Wrapper });
    expect(await screen.findByText('profile:findMe.registered')).toBeOnTheScreen();
    expect(screen.queryByLabelText('profile:findMe.label')).toBeNull();
  });
});
