import { useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth/useSession';
import { RpcError, type RpcErrorCode } from '@/lib/rpcError';

import { clearMyPhoneHash } from '@/features/friends/api';

import { completeProfile, type ProfileInput } from './api';
import { myProfileKey } from './hooks';

// Saves through complete_profile (the only write path for age/gender/creator) and refreshes the session.
export function useSaveProfile() {
  const queryClient = useQueryClient();
  const { userId } = useSession();
  return async (input: ProfileInput): Promise<RpcErrorCode | null> => {
    try {
      await completeProfile(input);
      // Turning contacts off also withdraws the hash of my number, so nobody can find me by it.
      if (!input.contactsOptIn) await clearMyPhoneHash();
      await queryClient.invalidateQueries({ queryKey: myProfileKey(userId ?? undefined) });
      return null;
    } catch (error) {
      return error instanceof RpcError ? error.code : 'UNKNOWN';
    }
  };
}
