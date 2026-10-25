import { Redirect } from 'expo-router';

import { useSessionStore } from '@/features/auth/store/sessionStore';

export default function Index() {
  const isSignedIn = useSessionStore((state) => state.isSignedIn);
  return <Redirect href={isSignedIn ? '/map' : '/sign-in'} />;
}
