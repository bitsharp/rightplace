import { createHash } from 'crypto';

import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { Share } from 'react-native';

import { renderApp } from '@/test/appFlows';
import { fakeSupabase } from '@/test/fakeSupabase';
import { seedFriendsBackend, type FakeUser } from '@/test/friendsBackend';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
}));

jest.mock('expo-crypto', () => {
  const { createHash: hash } = jest.requireActual<typeof import('crypto')>('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: jest.fn(async (_algorithm: string, value: string) =>
      hash('sha256').update(value).digest('hex'),
    ),
  };
});

const GATTO: FakeUser = { id: 'u-gatto', handle: 'gatto.blu', age_band: '25-34', gender: 'male' };
const LUPO: FakeUser = { id: 'u-lupo', handle: 'lupo.verde' };

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

describe('profilo: follower e bloccati', () => {
  it('elenca i follower e Rimuovi li toglie senza avvisarli', async () => {
    const backend = seedFriendsBackend({ users: [GATTO], followers: ['u-gatto'] });
    await renderApp('ready', '/profile');
    expect(await screen.findByText('profile:followers.title')).toBeOnTheScreen();
    expect(await screen.findByText('@gatto.blu')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', {
        name: 'profile:followers.a11yRemove({"handle":"@gatto.blu"})',
      }),
    );
    await waitFor(() => expect(screen.queryByText('@gatto.blu')).toBeNull());
    expect(rpcCalls('remove_follower')[0]?.[1]).toEqual({ p_follower_id: 'u-gatto' });
    expect(backend.followers.size).toBe(0);
  });

  it('elenca i bloccati e Sblocca li riporta', async () => {
    const backend = seedFriendsBackend({ users: [LUPO], blocked: ['u-lupo'] });
    await renderApp('ready', '/profile');
    expect(await screen.findByText('profile:blocked.title')).toBeOnTheScreen();
    expect(await screen.findByText('@lupo.verde')).toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole('button', { name: 'profile:blocked.a11yUnblock({"handle":"@lupo.verde"})' }),
    );
    await waitFor(() => expect(screen.queryByText('@lupo.verde')).toBeNull());
    expect(rpcCalls('unblock_user')[0]?.[1]).toEqual({ p_user_id: 'u-lupo' });
    expect(backend.blocked.size).toBe(0);
  });
});

describe('profilo: condividi il mio @tag', () => {
  it('apre la condivisione con il link dell’app e quello web, solo l’handle', async () => {
    seedFriendsBackend({ users: [] });
    const share = jest
      .spyOn(Share, 'share')
      .mockResolvedValue({ action: 'sharedAction', activityType: undefined });
    await renderApp('ready', '/profile');
    await fireEvent.press(await screen.findByRole('button', { name: 'profile:share.cta' }));
    const message = (share.mock.calls[0]?.[0] as { message: string }).message;
    expect(message).toContain('rightplace://u/lince.rosso');
    expect(message).toContain('https://rightplace.app/u/lince.rosso');
    expect(message).not.toContain('lince@example.com');
  });
});

describe('profilo: farsi trovare dal numero', () => {
  const NUMBER_FIELD = 'profile:findMe.label';

  it('senza consenso contatti la sezione non c’è', async () => {
    seedFriendsBackend({ users: [] });
    await renderApp('ready', '/profile');
    await screen.findByText('profile:followers.title');
    expect(screen.queryByLabelText(NUMBER_FIELD)).toBeNull();
  });

  it('salva solo l’hash del numero E.164 e svuota il campo', async () => {
    seedFriendsBackend({ users: [] });
    await renderApp('ready', '/profile', { contacts_opt_in: true });
    const field = await screen.findByLabelText(NUMBER_FIELD);
    await fireEvent.changeText(field, '345 123 4567');
    await fireEvent.press(screen.getByRole('button', { name: 'profile:findMe.save' }));
    const expected = createHash('sha256')
      .update('rightplace.contacts.v1:+393451234567')
      .digest('hex');
    await waitFor(() =>
      expect(rpcCalls('set_my_phone_hash')[0]?.[1]).toEqual({ p_hash: expected }),
    );
    expect(await screen.findByText('profile:findMe.saved')).toBeOnTheScreen();
    expect(screen.queryByDisplayValue('345 123 4567')).toBeNull();
    expect(JSON.stringify(fakeSupabase.rpc.mock.calls)).not.toContain('3451234567');
  });

  it('un numero non valido non parte', async () => {
    seedFriendsBackend({ users: [] });
    await renderApp('ready', '/profile', { contacts_opt_in: true });
    await fireEvent.changeText(await screen.findByLabelText(NUMBER_FIELD), 'abc');
    await fireEvent.press(screen.getByRole('button', { name: 'profile:findMe.save' }));
    expect(await screen.findByText('profile:findMe.invalid')).toBeOnTheScreen();
    expect(rpcCalls('set_my_phone_hash')).toHaveLength(0);
  });

  it('"Non farmi più trovare" cancella l’hash dal server', async () => {
    seedFriendsBackend({ users: [] });
    await renderApp('ready', '/profile', { contacts_opt_in: true });
    await fireEvent.press(await screen.findByRole('button', { name: 'profile:findMe.clear' }));
    await waitFor(() => expect(rpcCalls('clear_my_phone_hash')).toHaveLength(1));
    expect(await screen.findByText('profile:findMe.cleared')).toBeOnTheScreen();
  });

  it('disattivare il toggle contatti e salvare cancella anche l’hash del numero', async () => {
    seedFriendsBackend({ users: [] });
    await renderApp('ready', '/profile', { contacts_opt_in: true });
    await fireEvent.press(
      await screen.findByRole('switch', { name: 'profile:form.contacts.title' }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'profile:app.save' }));
    await waitFor(() => expect(rpcCalls('clear_my_phone_hash')).toHaveLength(1));
    expect(rpcCalls('complete_profile')[0]?.[1]).toMatchObject({ p_contacts_opt_in: false });
  });

  it('lasciare il toggle contatti spento non chiama nulla sul numero', async () => {
    seedFriendsBackend({ users: [] });
    await renderApp('ready', '/profile');
    await fireEvent.press(await screen.findByRole('button', { name: 'profile:app.save' }));
    await screen.findByText('profile:app.saved');
    expect(rpcCalls('set_my_phone_hash')).toHaveLength(0);
  });
});
