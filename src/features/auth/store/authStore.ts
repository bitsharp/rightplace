import { useEffect } from 'react';
import { create } from 'zustand';

import { supabase } from '@/lib/supabase';

export type AuthSession = {
  userId: string;
  email: string;
  emailConfirmed: boolean;
};

type SupabaseSessionLike = {
  user: { id: string; email?: string | null; email_confirmed_at?: string | null };
};

type AuthState = {
  initialized: boolean;
  session: AuthSession | null;
};

// Auth session only (UI/session state); the profile itself lives in TanStack Query.
export const useAuthStore = create<AuthState>()(() => ({ initialized: false, session: null }));

export function toAuthSession(session: SupabaseSessionLike | null): AuthSession | null {
  if (!session) return null;
  return {
    userId: session.user.id,
    email: session.user.email ?? '',
    emailConfirmed: Boolean(session.user.email_confirmed_at),
  };
}

const setSession = (session: SupabaseSessionLike | null) =>
  useAuthStore.setState({ initialized: true, session: toAuthSession(session) });

export function useAuthListener(): void {
  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => setSession(null));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => data.subscription.unsubscribe();
  }, []);
}
