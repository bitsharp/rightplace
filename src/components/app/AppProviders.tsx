import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, ThemeProvider, type Theme } from 'expo-router';
import { useState, type ReactNode } from 'react';

import { createQueryClient, PERSIST_MAX_AGE_MS, queryPersister } from '@/lib/queryClient';
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
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{ persister: queryPersister, maxAge: PERSIST_MAX_AGE_MS }}
    >
      <ThemeProvider value={navigationTheme}>{children}</ThemeProvider>
    </PersistQueryClientProvider>
  );
}
