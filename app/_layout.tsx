import { useFonts } from 'expo-font';
import { SplashScreen } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AppProviders } from '@/components/app/AppProviders';
import { RootNavigator } from '@/components/app/RootNavigator';
import { useI18nReady } from '@/i18n/useI18nReady';
import { FONT_ASSETS } from '@/theme/fontAssets';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
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
