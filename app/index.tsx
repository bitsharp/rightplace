import { Redirect, type Href } from 'expo-router';

import type { SessionStatus } from '@/features/auth/domain/sessionStatus';
import { useSession } from '@/features/auth/useSession';
import { useTourStore } from '@/features/tour/store/tourStore';
import { useTourHydrated } from '@/features/tour/useTourHydrated';

const HOME: Record<Exclude<SessionStatus, 'loading'>, Href> = {
  signedOut: '/sign-up',
  unverified: '/verify-email',
  needsProfile: '/profile-setup',
  needsHandle: '/handle',
  ready: '/map',
};

export default function Index() {
  const { status } = useSession();
  const hydrated = useTourHydrated();
  const welcomeSeen = useTourStore((state) => state.welcomeSeen);
  if (status === 'loading' || !hydrated) return null;
  // The welcome is the last step of onboarding: once, right before the tabs.
  if (status === 'ready' && !welcomeSeen) return <Redirect href="/welcome" />;
  return <Redirect href={HOME[status]} />;
}
