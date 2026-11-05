import { createHash } from 'crypto';

import { CONTACTS_HASH_SALT, hashPhone } from './hash';

const nodeDigest = async (value: string) => createHash('sha256').update(value).digest('hex');

describe('hashPhone', () => {
  it('è lo SHA-256 esadecimale di salt, due punti e numero E.164', async () => {
    const expected = createHash('sha256')
      .update(`${CONTACTS_HASH_SALT}:+393451234567`)
      .digest('hex');
    expect(await hashPhone('+393451234567', nodeDigest)).toBe(expected);
  });

  it('ha un salt pubblico versionato', () => {
    expect(CONTACTS_HASH_SALT).toBe('rightplace.contacts.v1');
  });

  it('produce 64 caratteri esadecimali minuscoli', async () => {
    expect(await hashPhone('+34612345678', nodeDigest)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('è deterministico e diverso per numeri diversi', async () => {
    const first = await hashPhone('+393451234567', nodeDigest);
    expect(await hashPhone('+393451234567', nodeDigest)).toBe(first);
    expect(await hashPhone('+393451234568', nodeDigest)).not.toBe(first);
  });

  it('porta in minuscolo un digest esadecimale maiuscolo', async () => {
    const upper = async (value: string) => (await nodeDigest(value)).toUpperCase();
    expect(await hashPhone('+393451234567', upper)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('non lascia uscire un digest malformato', async () => {
    await expect(hashPhone('+393451234567', async () => 'non-un-hash')).rejects.toThrow();
  });
});
