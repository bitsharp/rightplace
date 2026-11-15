import { Redirect, type Href } from 'expo-router';

import type { SessionStatus } from '@/features/auth/domain/sessionStatus';
import { useSession } from '@/features/auth/useSession';

const HOME: Record<Exclude<SessionStatus, 'loading'>, Href> = {
  signedOut: '/sign-up',
  unverified: '/verify-email',
  needsProfile: '/profile-setup',
  needsHandle: '/handle',
  ready: '/map',
};

export default function Index() {
  const { status } = useSession();
  if (status === 'loading') return null;
  return <Redirect href={HOME[status]} />;
}
