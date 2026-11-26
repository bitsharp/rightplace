import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { isTourStepId, type TourStepId } from '../domain/steps';

type TourState = {
  welcomeSeen: boolean;
  seenSteps: TourStepId[];
  markWelcomeSeen: () => void;
  markStepSeen: (id: TourStepId) => void;
  resetTour: () => void;
};

type TourData = Pick<TourState, 'welcomeSeen' | 'seenSteps'>;

export const TOUR_STORE_KEY = 'rightplace.tour';
const STORE_VERSION = 1;
const INITIAL: TourData = { welcomeSeen: false, seenSteps: [] };

// What the guide has shown lives only on this phone (principle 9): nothing goes to the server.
export function migrateTourState(persisted: unknown): TourData {
  const saved = persisted as Partial<Record<keyof TourData, unknown>> | null;
  const welcomeSeen = saved?.welcomeSeen === true;
  const seenSteps = Array.isArray(saved?.seenSteps) ? saved.seenSteps.filter(isTourStepId) : [];
  return { welcomeSeen, seenSteps };
}

export const useTourStore = create<TourState>()(
  persist(
    (set) => ({
      ...INITIAL,
      markWelcomeSeen: () => set({ welcomeSeen: true }),
      markStepSeen: (id) =>
        set((state) =>
          state.seenSteps.includes(id) ? state : { seenSteps: [...state.seenSteps, id] },
        ),
      resetTour: () => set({ ...INITIAL }),
    }),
    {
      name: TOUR_STORE_KEY,
      version: STORE_VERSION,
      migrate: migrateTourState,
      // Also validates data saved by this same version (corrupted storage): invalid -> defaults.
      merge: (persisted, current) => ({ ...current, ...migrateTourState(persisted) }),
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ welcomeSeen, seenSteps }) => ({ welcomeSeen, seenSteps }),
    },
  ),
);

export function resetTourStore(): void {
  useTourStore.setState({ ...INITIAL });
}
