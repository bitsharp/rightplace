import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';

import type { SessionStatus } from '@/features/auth/domain/sessionStatus';
import { useAuthListener } from '@/features/auth/store/authStore';
import { useSession } from '@/features/auth/useSession';
import { resetSeenStories } from '@/features/posts/store/seenStories';
import { useCoarseLocationSync } from '@/features/profile/location';
import { useDeviceLanguageSync } from '@/i18n/useDeviceLanguageSync';
import { colors } from '@/theme/tokens';

import { BootScreen } from './BootScreen';

// Which screens exist depends only on the session status (useSession); the client never decides
// on privacy, it only routes. Data access is enforced by RLS/RPC on the server.
export function RootNavigator() {
  useDeviceLanguageSync();
  useAuthListener();
  const { status, userId, profile, profileError, retryProfile } = useSession();
  useCoarseLocationSync(status === 'ready' && profile?.locationOptIn === true);
  useClearCacheOnSignOut(userId);
  if (status === 'loading')
    return <BootScreen error={profileError} onRetry={() => void retryProfile()} />;
  return <AppStack status={status} />;
}

function AppStack({ status }: { status: Exclude<SessionStatus, 'loading'> }) {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="auth/callback" />
      <Stack.Screen name="legal/[doc]" />
      <Stack.Protected guard={status === 'signedOut' || status === 'unverified'}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={status !== 'signedOut'}>
        <Stack.Screen name="reset-password" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'needsProfile'}>
        <Stack.Screen name="profile-setup" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'ready'}>
        {READY_SCREENS.map((screen) => (
          <Stack.Screen key={screen.name} name={screen.name} options={screen.options} />
        ))}
      </Stack.Protected>
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="(dev)/ui-kit" />
      </Stack.Protected>
    </Stack>
  );
}

const MODAL = { presentation: 'modal' } as const;
const READY_SCREENS = [
  { name: 'handle' },
  { name: '(tabs)' },
  { name: 'search' },
  { name: 'u/[handle]' },
  { name: 'venue/[id]' },
  { name: 'event/[id]' },
  { name: 'night/[id]/chat' },
  { name: 'post/new', options: MODAL },
  { name: 'story/[userId]', options: { presentation: 'fullScreenModal' } as const },
  { name: 'creator/index' },
  { name: 'creator/new-event' },
  { name: 'creator/event/[id]' },
  { name: 'creator/edit-event/[id]' },
  { name: 'creator/billing', options: MODAL },
];

// Shared devices: nothing of the previous user stays in memory after sign-out.
function useClearCacheOnSignOut(userId: string | null) {
  const queryClient = useQueryClient();
  useEffect(() => {
    if (userId === null) {
      queryClient.clear();
      resetSeenStories();
    }
  }, [userId, queryClient]);
}
