import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { DEFAULT_CITY_SLUG } from '@/features/profile/api';

export type MapViewMode = 'general' | 'friends';

type MapState = {
  view: MapViewMode;
  citySlug: string;
  setView: (view: MapViewMode) => void;
  setCitySlug: (citySlug: string) => void;
};

export const MAP_STORE_KEY = 'rightplace.map';

// UI preferences only. Single source of truth for the city: Search and Map both read it.
export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      view: 'general',
      citySlug: DEFAULT_CITY_SLUG,
      setView: (view) => set({ view }),
      setCitySlug: (citySlug) => set({ citySlug }),
    }),
    {
      name: MAP_STORE_KEY,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ view, citySlug }) => ({ view, citySlug }),
    },
  ),
);

export function resetMapStore(): void {
  useMapStore.setState({ view: 'general', citySlug: DEFAULT_CITY_SLUG });
}
