import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, ThemeProvider, type Theme } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';

import {
  createQueryClient,
  PERSIST_MAX_AGE_MS,
  queryPersister,
  shouldPersistQuery,
} from '@/lib/queryClient';
import { setupQueryFocus } from '@/lib/queryFocus';
import { colors } from '@/theme/tokens';

const navigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
  },
};

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  useEffect(() => setupQueryFocus(), []);
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: queryPersister,
        maxAge: PERSIST_MAX_AGE_MS,
        dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
      }}
    >
      {/* Gestures (photo viewer zoom, swipes) work only under this root. */}
      <GestureHandlerRootView testID="gesture-root" style={styles.root}>
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
          <ThemeProvider value={navigationTheme}>{children}</ThemeProvider>
        </KeyboardProvider>
      </GestureHandlerRootView>
    </PersistQueryClientProvider>
  );
}

const styles = StyleSheet.create({ root: { flex: 1 } });
