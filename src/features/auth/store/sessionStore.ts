import { create } from 'zustand';

// Fake session flag until Supabase Auth lands in prompt 05.
type SessionState = {
  isSignedIn: boolean;
  signIn: () => void;
  signOut: () => void;
};

export const useSessionStore = create<SessionState>()((set) => ({
  isSignedIn: false,
  signIn: () => set({ isSignedIn: true }),
  signOut: () => set({ isSignedIn: false }),
}));
