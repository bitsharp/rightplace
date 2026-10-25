import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { Unbounded_600SemiBold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AppProviders } from '@/components/app/AppProviders';
import { useSessionStore } from '@/features/auth/store/sessionStore';
import { useDeviceLanguageSync } from '@/i18n/useDeviceLanguageSync';
import { useI18nReady } from '@/i18n/useI18nReady';
import { colors } from '@/theme/tokens';

SplashScreen.preventAutoHideAsync();

const FONTS = {
  Unbounded_600SemiBold,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  SpaceMono_400Regular,
  SpaceMono_700Bold,
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONTS);
  const i18nReady = useI18nReady();
  const ready = (fontsLoaded || fontError !== null) && i18nReady;

  useEffect(() => {
    if (ready) SplashScreen.hide();
  }, [ready]);

  if (!ready) return null;
  return (
    <AppProviders>
      <StatusBar style="light" />
      <RootNavigator />
    </AppProviders>
  );
}

function RootNavigator() {
  useDeviceLanguageSync();
  const isSignedIn = useSessionStore((state) => state.isSignedIn);

  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}
    >
      <Stack.Screen name="index" />
      <Stack.Protected guard={!isSignedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isSignedIn}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="venue/[id]" />
        <Stack.Screen name="event/[id]" />
        <Stack.Screen name="night/[id]/chat" />
        <Stack.Screen name="post/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="creator/index" />
        <Stack.Screen name="creator/new-event" />
        <Stack.Screen name="creator/billing" options={{ presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}
