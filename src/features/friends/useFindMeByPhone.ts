import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { RpcError, type RpcErrorCode } from '@/lib/rpcError';

import { clearMyPhoneHash, hasPhoneHash, setMyPhoneHash } from './api';
import { sha256 } from './digest';
import { hashPhone } from './domain/hash';
import { toE164 } from './domain/phone';
import { PHONE_HASH_STATUS_KEY } from './keys';
import { useDefaultCountry } from './useDefaultCountry';

export type FindMeStatus = 'idle' | 'saved' | 'invalid' | 'cleared' | RpcErrorCode;

const codeOf = (error: unknown): RpcErrorCode =>
  error instanceof RpcError ? error.code : 'UNKNOWN';

// Principle 4: the number is typed, normalised, hashed and dropped. It is never kept in a store,
// in AsyncStorage or in the query cache; only the hash goes to the server.
export function useFindMeByPhone() {
  const defaultCountry = useDefaultCountry();
  const queryClient = useQueryClient();
  // Cancelling first: a status request still in flight would overwrite the answer we just know.
  const rememberRegistered = async (registered: boolean) => {
    await queryClient.cancelQueries({ queryKey: PHONE_HASH_STATUS_KEY });
    queryClient.setQueryData(PHONE_HASH_STATUS_KEY, registered);
  };
  // Only a yes/no from the server survives a restart: the number itself is gone once hashed.
  const registeredQuery = useQuery({
    queryKey: PHONE_HASH_STATUS_KEY,
    queryFn: hasPhoneHash,
    meta: { persist: false },
  });
  const [number, setNumber] = useState('');
  const [status, setStatus] = useState<FindMeStatus>('idle');

  const save = async () => {
    const e164 = toE164(number, defaultCountry);
    if (!e164) return setStatus('invalid');
    try {
      await setMyPhoneHash(await hashPhone(e164, sha256));
      await rememberRegistered(true);
      setNumber('');
      setStatus('saved');
    } catch (error) {
      setStatus(codeOf(error));
    }
  };

  const clear = async () => {
    try {
      await clearMyPhoneHash();
      await rememberRegistered(false);
      setNumber('');
      setStatus('cleared');
    } catch (error) {
      setStatus(codeOf(error));
    }
  };

  return { number, setNumber, status, save, clear, registered: registeredQuery.data === true };
}
