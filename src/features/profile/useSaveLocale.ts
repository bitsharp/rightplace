import { useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/useSession';
import { invalidateKeys } from '@/features/friends/keys';
import type { Language } from '@/i18n/domain/pickLanguage';
import { RpcError, type RpcErrorCode } from '@/lib/rpcError';

import { setLocale } from './api';
import { myProfileKey } from './hooks';

// profiles.locale drives push, AI and emails. The profile is refreshed afterwards: the settings screens
// send the whole profile to complete_profile, and a stale locale there would undo this change.
export function useSaveLocale() {
  const queryClient = useQueryClient();
  const { userId } = useSession();
  return async (locale: Language): Promise<RpcErrorCode | null> => {
    try {
      await setLocale(locale);
      await invalidateKeys(queryClient, [myProfileKey(userId ?? undefined)]);
      return null;
    } catch (error) {
      return error instanceof RpcError ? error.code : 'UNKNOWN';
    }
  };
}
