import { useMutation } from '@tanstack/react-query';

import { RpcError, type RpcErrorCode } from '@/lib/rpcError';

import { findFriendsFromContacts } from './contacts';
import { useDefaultCountry } from './useDefaultCountry';

// Suggestions live only in this mutation's result: nothing from the address book is persisted.
export function useContactSuggestions() {
  const defaultCountry = useDefaultCountry();
  const search = useMutation({ mutationFn: () => findFriendsFromContacts({ defaultCountry }) });
  const errorCode: RpcErrorCode | null = search.error
    ? search.error instanceof RpcError
      ? search.error.code
      : 'UNKNOWN'
    : null;
  return {
    find: () => search.mutate(),
    loading: search.isPending,
    result: search.data ?? null,
    errorCode,
  };
}
