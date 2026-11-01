import { Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from '@expo-google-fonts/inter';
import { SpaceMono_400Regular, SpaceMono_700Bold } from '@expo-google-fonts/space-mono';
import { Unbounded_700Bold } from '@expo-google-fonts/unbounded';
import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AppProviders } from '@/components/app/AppProviders';
import { RootNavigator } from '@/components/app/RootNavigator';
import { useI18nReady } from '@/i18n/useI18nReady';

SplashScreen.preventAutoHideAsync();

const FONTS = {
  Unbounded_700Bold,
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
