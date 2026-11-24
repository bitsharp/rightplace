import { useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useEffect } from 'react';

import type { SessionStatus } from '@/features/auth/domain/sessionStatus';
import { useAuthListener } from '@/features/auth/store/authStore';
import { useSession } from '@/features/auth/useSession';
import { FeedbackHost } from '@/features/feedback/FeedbackHost';
import { useSyncProfileCity } from '@/features/map/useSyncProfileCity';
import { useCreatorUi } from '@/features/creator/useCreatorUi';
import { resetSeenStories } from '@/features/posts/store/seenStories';
import { PrePermissionSheet } from '@/features/notifications/components/PrePermissionSheet';
import { useNotificationRuntime } from '@/features/notifications/useNotificationRuntime';
import { useCoarseLocationSync } from '@/features/profile/location';
import { useDeviceLanguageSync } from '@/i18n/useDeviceLanguageSync';
import { colors } from '@/theme/tokens';

import { BootScreen } from './BootScreen';
import { LinkActionsHost } from './LinkActionsHost';

// Which screens exist depends only on the session status (useSession); the client never decides
// on privacy, it only routes. Data access is enforced by RLS/RPC on the server.
export function RootNavigator() {
  useDeviceLanguageSync();
  useAuthListener();
  const { status, userId, profile, profileError, retryProfile } = useSession();
  useCoarseLocationSync(status === 'ready' && profile?.locationOptIn === true);
  useSyncProfileCity(status === 'ready');
  useClearCacheOnSignOut(userId);
  useNotificationRuntime(status === 'ready');
  if (status === 'loading')
    return <BootScreen error={profileError} onRetry={() => void retryProfile()} />;
  return <AppStack status={status} />;
}

function AppStack({ status }: { status: Exclude<SessionStatus, 'loading'> }) {
  const { canOpenCreatorRoutes } = useCreatorUi();
  const isSupport = useSession().profile?.isSupport === true;
  return (
    <>
      <PrePermissionSheet />
      <LinkActionsHost />
      <FeedbackHost />
      <AppScreens
        status={status}
        canOpenCreatorRoutes={canOpenCreatorRoutes}
        canOpenSupportRoutes={isSupport}
      />
    </>
  );
}

function AppScreens({
  status,
  canOpenCreatorRoutes,
  canOpenSupportRoutes,
}: {
  status: Exclude<SessionStatus, 'loading'>;
  canOpenCreatorRoutes: boolean;
  canOpenSupportRoutes: boolean;
}) {
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
      <Stack.Protected guard={status === 'needsHandle'}>
        <Stack.Screen name="handle" />
      </Stack.Protected>
      <Stack.Protected guard={status === 'ready'}>
        {READY_SCREENS.map((screen) => (
          <Stack.Screen key={screen.name} name={screen.name} options={screen.options} />
        ))}
      </Stack.Protected>
      <Stack.Protected guard={status === 'ready' && canOpenCreatorRoutes}>
        {CREATOR_SCREENS.map((screen) => (
          <Stack.Screen key={screen.name} name={screen.name} options={screen.options} />
        ))}
      </Stack.Protected>
      {/* The feedback inbox exists only for support accounts: anyone else is redirected by the router. */}
      <Stack.Protected guard={status === 'ready' && canOpenSupportRoutes}>
        <Stack.Screen name="support/feedback" />
      </Stack.Protected>
      <Stack.Protected guard={__DEV__}>
        <Stack.Screen name="(dev)/ui-kit" />
      </Stack.Protected>
    </Stack>
  );
}

const MODAL = { presentation: 'modal' } as const;
const READY_SCREENS = [
  { name: '(tabs)' },
  { name: 'search' },
  { name: 'activity' },
  { name: 'friends/requests' },
  { name: 'u/[handle]' },
  { name: 'profile/edit' },
  { name: 'profile/language' },
  { name: 'profile/notifications' },
  { name: 'profile/privacy' },
  { name: 'profile/city' },
  { name: 'profile/tag' },
  { name: 'profile/personal' },
  { name: 'profile/about' },
  { name: 'profile/followers' },
  { name: 'profile/following' },
  { name: 'venue/[id]' },
  { name: 'event/[id]' },
  { name: 'night/[id]/chat' },
  { name: 'dm/[threadId]' },
  { name: 'post/new', options: MODAL },
  { name: 'post/[id]' },
  { name: 'story/[userId]', options: { presentation: 'fullScreenModal' } as const },
];

// Hidden in tester builds (EXPO_PUBLIC_CREATOR_ENABLED off): direct URLs are redirected by the router.
const CREATOR_SCREENS = [
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
