import { create } from 'zustand';

// After complete_profile the session becomes "ready" at once; this flag makes the "your name" step
// (handle reveal) appear before the map, exactly once per onboarding.
type OnboardingState = {
  pendingHandleReveal: boolean;
  startHandleReveal: () => void;
  finishHandleReveal: () => void;
};

export const useOnboardingStore = create<OnboardingState>()((set) => ({
  pendingHandleReveal: false,
  startHandleReveal: () => set({ pendingHandleReveal: true }),
  finishHandleReveal: () => set({ pendingHandleReveal: false }),
}));
