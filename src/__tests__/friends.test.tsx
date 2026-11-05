import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Contacts from 'expo-contacts/legacy';

import { renderApp } from '@/test/appFlows';
import { fakeSupabase } from '@/test/fakeSupabase';
import { seedFriendsBackend, type FakeUser } from '@/test/friendsBackend';

jest.mock('expo-contacts/legacy', () => ({
  requestPermissionsAsync: jest.fn(),
  getContactsAsync: jest.fn(),
  Fields: { PhoneNumbers: 'phoneNumbers' },
  PermissionStatus: { GRANTED: 'granted', DENIED: 'denied' },
}));

jest.mock('expo-crypto', () => {
  const { createHash } = jest.requireActual<typeof import('crypto')>('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: jest.fn(async (_algorithm: string, value: string) =>
      createHash('sha256').update(value).digest('hex'),
    ),
  };
});

const VOLPE: FakeUser = { id: 'u-volpe', handle: 'volpe.viola', venue: 'Arena Club' };
const GATTO: FakeUser = { id: 'u-gatto', handle: 'gatto.blu', age_band: '25-34', gender: 'male' };
const LUPO: FakeUser = { id: 'u-lupo', handle: 'lupo.verde', age_band: '25-34', gender: 'male' };
const USERS = [VOLPE, GATTO, LUPO];

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

const requestButton = (handle: string) =>
  screen.findByRole('button', { name: `ui:follow.a11yRequest({"handle":"@${handle}"})` });

async function search(text: string) {
  await fireEvent.changeText(await screen.findByLabelText('friends:searchLabel'), text);
}

describe('amici: cerca e richiedi di seguire', () => {
  it('cerco "volpe": risultato con handle e fascia, nessun locale', async () => {
    seedFriendsBackend({ users: USERS });
    await renderApp('ready', '/friends');
    await search('volpe');
    expect(await screen.findByText('@volpe.viola')).toBeOnTheScreen();
    expect(screen.queryByText('@gatto.blu')).toBeNull();
    expect(screen.getByText(/friends:meta/)).toBeOnTheScreen();
    expect(screen.queryByText(/friends:tonight/)).toBeNull();
    expect(screen.getByText('ui:follow.request')).toBeOnTheScreen();
  });

  it('mostra il suggerimento sul perché seguire e il contatore dei seguiti', async () => {
    seedFriendsBackend({ users: USERS, accepted: ['u-gatto'] });
    await renderApp('ready', '/friends');
    expect(await screen.findByText('friends:hint')).toBeOnTheScreen();
    expect(await screen.findByText('friends:followingCount({"count":1})')).toBeOnTheScreen();
  });

  it('Richiedi → "Richiesta inviata"; il tap successivo ritira la richiesta', async () => {
    seedFriendsBackend({ users: USERS });
    await renderApp('ready', '/friends');
    await search('volpe');
    await fireEvent.press(await requestButton('volpe.viola'));
    expect(await screen.findByText('ui:follow.requested')).toBeOnTheScreen();
    expect(rpcCalls('request_follow')[0]?.[1]).toEqual({ p_user_id: 'u-volpe' });
    expect(screen.queryByText(/friends:tonight/)).toBeNull();

    await fireEvent.press(
      screen.getByRole('button', { name: 'ui:follow.a11yCancel({"handle":"@volpe.viola"})' }),
    );
    expect(await screen.findByText('ui:follow.request')).toBeOnTheScreen();
    expect(rpcCalls('cancel_follow_request')).toHaveLength(1);
  });

  it('con follow accettato compare "Stasera: <locale>" e non prima', async () => {
    seedFriendsBackend({ users: USERS, accepted: ['u-volpe'] });
    await renderApp('ready', '/friends');
    await search('volpe');
    expect(await screen.findByText('friends:tonight({"venue":"Arena Club"})')).toBeOnTheScreen();
    expect(screen.getByText('ui:follow.following')).toBeOnTheScreen();
  });

  it('nessun risultato: messaggio dedicato', async () => {
    seedFriendsBackend({ users: USERS });
    await renderApp('ready', '/friends');
    await search('zzz');
    expect(await screen.findByText('friends:noResults')).toBeOnTheScreen();
  });

  it('chi mi segue e io non seguo mostra "Ti segue"', async () => {
    seedFriendsBackend({ users: USERS, followers: ['u-gatto'] });
    await renderApp('ready', '/friends');
    await search('gatto');
    expect(await screen.findByText('ui:follow.followsYou')).toBeOnTheScreen();
  });
});

describe('amici: richieste ricevute', () => {
  it('mostra le richieste con il badge sulla tab; Accetta toglie la riga e scala il badge', async () => {
    const backend = seedFriendsBackend({ users: USERS, requests: ['u-gatto', 'u-lupo'] });
    await renderApp('ready', '/friends');
    expect(await screen.findByText('friends:requests.title')).toBeOnTheScreen();
    expect(await screen.findByTestId('tab-badge-friends')).toHaveProp(
      'accessibilityLabel',
      'common:tabBadge({"count":2})',
    );
    await fireEvent.press(
      screen.getByRole('button', { name: 'friends:requests.a11yAccept({"handle":"@gatto.blu"})' }),
    );
    await waitFor(() => expect(screen.queryByText('@gatto.blu')).toBeNull());
    expect(rpcCalls('accept_follow')[0]?.[1]).toEqual({ p_follower_id: 'u-gatto' });
    expect(backend.followers.has('u-gatto')).toBe(true);
    await waitFor(() =>
      expect(screen.getByTestId('tab-badge-friends')).toHaveProp(
        'accessibilityLabel',
        'common:tabBadge({"count":1})',
      ),
    );
  });

  it('Rifiuta toglie la riga e chiama decline_follow', async () => {
    seedFriendsBackend({ users: USERS, requests: ['u-lupo'] });
    await renderApp('ready', '/friends');
    await fireEvent.press(
      await screen.findByRole('button', {
        name: 'friends:requests.a11yDecline({"handle":"@lupo.verde"})',
      }),
    );
    await waitFor(() => expect(screen.queryByText('@lupo.verde')).toBeNull());
    expect(rpcCalls('decline_follow')[0]?.[1]).toEqual({ p_follower_id: 'u-lupo' });
    expect(screen.queryByText('friends:requests.title')).toBeNull();
  });
});

describe('amici: seguiti, blocco e segnalazione', () => {
  it('senza ricerca elenca i seguiti con dove vanno stasera', async () => {
    seedFriendsBackend({ users: USERS, accepted: ['u-volpe'] });
    await renderApp('ready', '/friends');
    expect(await screen.findByText('friends:following.title')).toBeOnTheScreen();
    expect(await screen.findByText('@volpe.viola')).toBeOnTheScreen();
    expect(screen.getByText('friends:tonight({"venue":"Arena Club"})')).toBeOnTheScreen();
  });

  it('il tap lungo apre il menu: Blocca con conferma e la persona sparisce', async () => {
    const backend = seedFriendsBackend({ users: USERS });
    await renderApp('ready', '/friends');
    await search('gatto');
    await fireEvent(await screen.findByText('@gatto.blu'), 'longPress');
    await fireEvent.press(await screen.findByRole('button', { name: 'friends:person.block' }));
    expect(
      await screen.findByText('friends:person.blockTitle({"handle":"@gatto.blu"})'),
    ).toBeOnTheScreen();
    expect(rpcCalls('block_user')).toHaveLength(0);
    await fireEvent.press(screen.getByRole('button', { name: 'friends:person.blockConfirm' }));
    await waitFor(() => expect(screen.queryByText('@gatto.blu')).toBeNull());
    expect(rpcCalls('block_user')[0]?.[1]).toEqual({ p_user_id: 'u-gatto' });
    expect(backend.blocked.has('u-gatto')).toBe(true);
  });

  it('Segnala invia la segnalazione e conferma con un messaggio', async () => {
    const backend = seedFriendsBackend({ users: USERS });
    await renderApp('ready', '/friends');
    await search('lupo');
    await fireEvent(await screen.findByText('@lupo.verde'), 'longPress');
    await fireEvent.press(await screen.findByRole('button', { name: 'friends:person.report' }));
    expect(await screen.findByText('friends:person.reported')).toBeOnTheScreen();
    expect(backend.reports).toEqual([{ id: 'u-lupo', reason: null }]);
    expect(rpcCalls('report')[0]?.[1]).toMatchObject({ p_target_kind: 'user' });
  });
});

describe('amici: suggeriti dai contatti', () => {
  const grant = () => {
    jest.mocked(Contacts.requestPermissionsAsync).mockResolvedValue({
      status: Contacts.PermissionStatus.GRANTED,
      granted: true,
      canAskAgain: true,
      expires: 'never',
    });
    jest.mocked(Contacts.getContactsAsync).mockResolvedValue({
      data: [
        {
          id: '1',
          name: 'Marco',
          contactType: 'person',
          phoneNumbers: [{ number: '345 123 4567' }],
        },
      ],
      hasNextPage: false,
      hasPreviousPage: false,
    } as never);
  };

  it('senza opt-in contatti la sezione non esiste e il permesso non viene chiesto', async () => {
    seedFriendsBackend({ users: USERS });
    await renderApp('ready', '/friends');
    await screen.findByText('friends:hint');
    expect(screen.queryByText('friends:contacts.cta')).toBeNull();
    expect(Contacts.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('con opt-in, il bottone chiede il permesso e mostra i match con "dalla tua rubrica"', async () => {
    seedFriendsBackend({ users: USERS, contactMatches: ['u-lupo'] });
    grant();
    await renderApp('ready', '/friends', { contacts_opt_in: true });
    expect(Contacts.requestPermissionsAsync).not.toHaveBeenCalled();
    await fireEvent.press(await screen.findByRole('button', { name: 'friends:contacts.cta' }));
    expect(await screen.findByText('@lupo.verde')).toBeOnTheScreen();
    expect(screen.getByText(/friends:contacts.fromBook/)).toBeOnTheScreen();
    const sent = (rpcCalls('match_contacts')[0]?.[1] as { p_hashes: string[] }).p_hashes;
    sent.forEach((hash) => expect(hash).toMatch(/^[0-9a-f]{64}$/));
    expect(JSON.stringify(fakeSupabase.rpc.mock.calls)).not.toContain('Marco');
  });

  it('permesso negato: messaggio, nessuna chiamata al server', async () => {
    seedFriendsBackend({ users: USERS });
    jest.mocked(Contacts.requestPermissionsAsync).mockResolvedValue({
      status: Contacts.PermissionStatus.DENIED,
      granted: false,
      canAskAgain: false,
      expires: 'never',
    });
    await renderApp('ready', '/friends', { contacts_opt_in: true });
    await fireEvent.press(await screen.findByRole('button', { name: 'friends:contacts.cta' }));
    expect(await screen.findByText('friends:contacts.denied')).toBeOnTheScreen();
    expect(rpcCalls('match_contacts')).toHaveLength(0);
  });
});

describe('profilo pubblico da link', () => {
  it('/u/<handle> apre il profilo minimo con il bottone Richiedi', async () => {
    seedFriendsBackend({ users: USERS });
    await renderApp('ready', '/u/volpe.viola');
    expect(await screen.findByText('@volpe.viola')).toBeOnTheScreen();
    expect(screen.getByText(/friends:meta/)).toBeOnTheScreen();
    expect(screen.queryByText(/friends:tonight/)).toBeNull();
    await fireEvent.press(await requestButton('volpe.viola'));
    expect(await screen.findByText('ui:follow.requested')).toBeOnTheScreen();
  });

  it('un handle inesistente mostra lo stato vuoto', async () => {
    seedFriendsBackend({ users: USERS });
    await renderApp('ready', '/u/nessuno.rosso');
    expect(await screen.findByText('friends:publicProfile.notFound')).toBeOnTheScreen();
  });

  it('cerca l’handle esatto, non un frammento', async () => {
    seedFriendsBackend({ users: [...USERS, { id: 'u-altro', handle: 'volpe.viola2' }] });
    await renderApp('ready', '/u/volpe.viola');
    await screen.findByText('@volpe.viola');
    expect(screen.queryByText('@volpe.viola2')).toBeNull();
  });
});
