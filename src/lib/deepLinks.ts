import * as Linking from 'expo-linking';

export type CallbackNext = 'reset-password';

// rightplace://auth/callback in builds, exp://…/--/auth/callback in Expo Go.
// Both patterns must be in Supabase Auth → URL Configuration → Redirect URLs.
export function authCallbackUrl(next?: CallbackNext): string {
  return Linking.createURL('auth/callback', next ? { queryParams: { next } } : undefined);
}
