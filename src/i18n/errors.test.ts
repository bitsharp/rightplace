import { AUTH_ERROR_CODES } from '@/features/auth/domain/authErrors';
import { RPC_ERROR_CODES } from '@/lib/rpcError';

import enErrors from './en/errors.json';
import itErrors from './it/errors.json';

describe('messaggi di errore', () => {
  it.each([
    ['it', itErrors],
    ['en', enErrors],
  ])('ogni codice di errore di auth e RPC ha un messaggio umano in %s', (_, errors) => {
    for (const code of AUTH_ERROR_CODES) expect(errors.auth).toHaveProperty(code);
    for (const code of RPC_ERROR_CODES) expect(errors.rpc).toHaveProperty(code);
  });
});
