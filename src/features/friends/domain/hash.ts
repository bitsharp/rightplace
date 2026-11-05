// Public, versioned salt (not a secret): it only keeps the hashes from being a generic SHA-256
// lookup table. Changing it invalidates every stored phone hash, so it needs a migration plan
// (see docs/contacts-hashing.md).
export const CONTACTS_HASH_SALT = 'rightplace.contacts.v1';

const SHA256_HEX = /^[0-9a-f]{64}$/;

// `digest` is injected (expo-crypto in the app) so this stays a pure, testable function.
export async function hashPhone(
  e164: string,
  digest: (value: string) => Promise<string>,
): Promise<string> {
  const hash = (await digest(`${CONTACTS_HASH_SALT}:${e164}`)).toLowerCase();
  // The server rejects anything else; failing here means a number can never leave the device by mistake.
  if (!SHA256_HEX.test(hash)) throw new Error('INVALID_DIGEST');
  return hash;
}
