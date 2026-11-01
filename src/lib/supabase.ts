import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

import { createChunkedStorage } from './chunkedSecureStore';
import type { Database } from './database.types';
import { loadEnv } from './env';

const env = loadEnv();

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    // the session (refresh token) lives in the Keychain/Keystore, never in plain AsyncStorage
    storage: createChunkedStorage(SecureStore),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // email links come back as deep links with a one-time code (exchangeCodeForSession)
    flowType: 'pkce',
  },
});

// Refresh tokens only while the app is in the foreground (Supabase guidance for React Native).
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

export type SupabaseClient = typeof supabase;
