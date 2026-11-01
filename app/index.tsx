import { Redirect, type Href } from 'expo-router';

import type { SessionStatus } from '@/features/auth/domain/sessionStatus';
import { useSession } from '@/features/auth/useSession';
import { useOnboardingStore } from '@/features/profile/store/onboardingStore';

const HOME: Record<Exclude<SessionStatus, 'loading'>, Href> = {
  signedOut: '/sign-up',
  unverified: '/verify-email',
  needsProfile: '/profile-setup',
  ready: '/map',
};

export default function Index() {
  const { status } = useSession();
  const pendingHandleReveal = useOnboardingStore((state) => state.pendingHandleReveal);
  if (status === 'loading') return null;
  if (status === 'ready' && pendingHandleReveal) return <Redirect href="/handle" />;
  return <Redirect href={HOME[status]} />;
}
