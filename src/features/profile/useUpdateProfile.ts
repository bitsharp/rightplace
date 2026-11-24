import { useSession } from '@/features/auth/useSession';
import type { RpcErrorCode } from '@/lib/rpcError';

import type { ProfileInput } from './api';
import { toProfileInput } from './domain/profileInput';
import { useSaveProfile } from './useSaveProfile';

// Saves one setting (a toggle, say) through complete_profile: the current profile with the patch on top.
export function useUpdateProfile() {
  const { profile } = useSession();
  const save = useSaveProfile();
  return async (patch: Partial<ProfileInput>): Promise<RpcErrorCode | null> => {
    const current = profile ? toProfileInput(profile) : null;
    if (!current) return 'UNKNOWN';
    return save({ ...current, ...patch });
  };
}
