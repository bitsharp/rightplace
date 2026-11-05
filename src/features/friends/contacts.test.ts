import * as Contacts from 'expo-contacts/legacy';
import * as Crypto from 'expo-crypto';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';

import { findFriendsFromContacts } from './contacts';

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

const NAMES = ['Marco Rossi', 'Giulia Bianchi', 'Zio Pino'];

const contact = (name: string, numbers: string[]) => ({
  id: name,
  name,
  contactType: 'person',
  phoneNumbers: numbers.map((number) => ({ number })),
});

function grantContacts(contacts: ReturnType<typeof contact>[], pageSize = 1000) {
  jest.mocked(Contacts.requestPermissionsAsync).mockResolvedValue({
    status: Contacts.PermissionStatus.GRANTED,
    granted: true,
    canAskAgain: true,
    expires: 'never',
  });
  jest.mocked(Contacts.getContactsAsync).mockImplementation(async (query) => {
    const offset = query?.pageOffset ?? 0;
    const size = query?.pageSize ?? pageSize;
    return {
      data: contacts.slice(offset, offset + size) as never,
      hasNextPage: offset + size < contacts.length,
      hasPreviousPage: offset > 0,
    };
  });
}

const sentPayloads = () =>
  fakeSupabase.rpc.mock.calls
    .filter(([name]) => name === 'match_contacts')
    .map(([, args]) => args as { p_hashes: string[] });

describe('findFriendsFromContacts', () => {
  beforeEach(() => setFakeRpc({ match_contacts: [] }));

  it('invia solo hash SHA-256 esadecimali: mai numeri né nomi', async () => {
    grantContacts([
      contact(NAMES[0] ?? '', ['345 123 4567']),
      contact(NAMES[1] ?? '', ['+39 02 1234567', '338 765 4321']),
    ]);
    await findFriendsFromContacts({ defaultCountry: 'IT' });
    const payloads = sentPayloads();
    expect(payloads).toHaveLength(1);
    const hashes = payloads[0]?.p_hashes ?? [];
    expect(hashes).toHaveLength(3);
    hashes.forEach((hash) => expect(hash).toMatch(/^[0-9a-f]{64}$/));
    const serialized = JSON.stringify(fakeSupabase.rpc.mock.calls);
    ['3451234567', '021234567', '3387654321', ...NAMES, 'Marco', 'Rossi'].forEach((secret) =>
      expect(serialized).not.toContain(secret),
    );
  });

  it('chiede il permesso e legge solo i numeri di telefono', async () => {
    grantContacts([contact('Marco', ['345 123 4567'])]);
    await findFriendsFromContacts({ defaultCountry: 'IT' });
    expect(Contacts.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Contacts.getContactsAsync).toHaveBeenCalledWith(
      expect.objectContaining({ fields: ['phoneNumbers'] }),
    );
  });

  it('se il permesso è negato non legge la rubrica e non chiama il server', async () => {
    jest.mocked(Contacts.requestPermissionsAsync).mockResolvedValue({
      status: Contacts.PermissionStatus.DENIED,
      granted: false,
      canAskAgain: false,
      expires: 'never',
    });
    const result = await findFriendsFromContacts({ defaultCountry: 'IT' });
    expect(result).toEqual({ status: 'denied' });
    expect(Contacts.getContactsAsync).not.toHaveBeenCalled();
    expect(sentPayloads()).toHaveLength(0);
  });

  it('scarta i numeri non validi e deduplica quelli ripetuti', async () => {
    grantContacts([
      contact('A', ['345 123 4567', '+39 345 1234567', 'non è un numero', '12']),
      contact('B', ['0039 345 1234567']),
    ]);
    await findFriendsFromContacts({ defaultCountry: 'IT' });
    expect(sentPayloads()[0]?.p_hashes).toHaveLength(1);
  });

  it('divide in blocchi da al massimo 500 hash', async () => {
    const many = Array.from({ length: 1201 }, (_, index) =>
      contact(`C${index}`, [`3${String(index).padStart(9, '0')}`]),
    );
    grantContacts(many);
    await findFriendsFromContacts({ defaultCountry: 'IT' });
    expect(sentPayloads().map((payload) => payload.p_hashes.length)).toEqual([500, 500, 201]);
  });

  it('senza numeri validi non chiama il server', async () => {
    grantContacts([contact('Nessuno', [])]);
    expect(await findFriendsFromContacts({ defaultCountry: 'IT' })).toEqual({
      status: 'ok',
      matches: [],
    });
    expect(sentPayloads()).toHaveLength(0);
  });

  it('restituisce i profili pubblici trovati, senza doppioni tra i blocchi', async () => {
    const person = {
      user_id: 'u1',
      handle: 'volpe.viola',
      age_band: '18-24',
      gender: 'female',
      is_creator: false,
    };
    setFakeRpc({ match_contacts: [person] });
    const many = Array.from({ length: 600 }, (_, index) =>
      contact(`C${index}`, [`3${String(index).padStart(9, '0')}`]),
    );
    grantContacts(many);
    const result = await findFriendsFromContacts({ defaultCountry: 'IT' });
    expect(result).toEqual({
      status: 'ok',
      matches: [expect.objectContaining({ userId: 'u1', handle: 'volpe.viola' })],
    });
  });

  it('usa SHA-256 di expo-crypto con salt e numero E.164', async () => {
    grantContacts([contact('A', ['345 123 4567'])]);
    await findFriendsFromContacts({ defaultCountry: 'IT' });
    expect(Crypto.digestStringAsync).toHaveBeenCalledWith(
      'SHA-256',
      'rightplace.contacts.v1:+393451234567',
    );
  });
});
