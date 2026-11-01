import { useMyProfile } from '@/features/profile/hooks';

import { deriveSessionStatus } from './domain/sessionStatus';
import { useAuthStore } from './store/authStore';

export function useSession() {
  const { initialized, session } = useAuthStore();
  const userId = session?.emailConfirmed ? session.userId : undefined;
  const profileQuery = useMyProfile(userId);
  const profile = profileQuery.isSuccess ? profileQuery.data : undefined;

  return {
    status: deriveSessionStatus({ initialized, session, profile }),
    email: session?.email ?? null,
    userId: session?.userId ?? null,
    profile: profile ?? null,
    profileError: profileQuery.isError,
    retryProfile: profileQuery.refetch,
  };
}
