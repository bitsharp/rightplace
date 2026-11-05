import { useState } from 'react';

import { RpcError, type RpcErrorCode } from '@/lib/rpcError';

import { clearMyPhoneHash, setMyPhoneHash } from './api';
import { sha256 } from './digest';
import { hashPhone } from './domain/hash';
import { toE164 } from './domain/phone';
import { useDefaultCountry } from './useDefaultCountry';

export type FindMeStatus = 'idle' | 'saved' | 'invalid' | 'cleared' | RpcErrorCode;

const codeOf = (error: unknown): RpcErrorCode =>
  error instanceof RpcError ? error.code : 'UNKNOWN';

// Principle 4: the number is typed, normalised, hashed and dropped. It is never kept in a store,
// in AsyncStorage or in the query cache; only the hash goes to the server.
export function useFindMeByPhone() {
  const defaultCountry = useDefaultCountry();
  const [number, setNumber] = useState('');
  const [status, setStatus] = useState<FindMeStatus>('idle');

  const save = async () => {
    const e164 = toE164(number, defaultCountry);
    if (!e164) return setStatus('invalid');
    try {
      await setMyPhoneHash(await hashPhone(e164, sha256));
      setNumber('');
      setStatus('saved');
    } catch (error) {
      setStatus(codeOf(error));
    }
  };

  const clear = async () => {
    try {
      await clearMyPhoneHash();
      setNumber('');
      setStatus('cleared');
    } catch (error) {
      setStatus(codeOf(error));
    }
  };

  return { number, setNumber, status, save, clear };
}
