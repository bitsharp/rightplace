import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AUTO_CITY, type CityPreference } from '../domain/cityChoice';

export type MapViewMode = 'general' | 'friends';

// Only the first-ever opening: afterwards the persisted last choice wins.
const DEFAULT_VIEW: MapViewMode = 'friends';

type MapState = {
  view: MapViewMode;
  // 'auto' (default) or the slug the user chose. The city actually shown comes from
  // useCurrentCity(): nobody reads this field directly.
  cityPreference: CityPreference;
  setView: (view: MapViewMode) => void;
  setCityPreference: (cityPreference: CityPreference) => void;
};

export const MAP_STORE_KEY = 'rightplace.map';
const STORE_VERSION = 1;

// v0 persisted `citySlug`, which was also the default 'milano' nobody had chosen: it cannot be told
// apart from a real choice, so every old value goes back to automatic.
function migrateMapState(persisted: unknown): Pick<MapState, 'view' | 'cityPreference'> {
  const view = (persisted as { view?: MapViewMode } | null)?.view;
  const valid = view === 'friends' || view === 'general';
  return { view: valid ? view : DEFAULT_VIEW, cityPreference: AUTO_CITY };
}

// UI preferences only.
export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      view: DEFAULT_VIEW,
      cityPreference: AUTO_CITY,
      setView: (view) => set({ view }),
      setCityPreference: (cityPreference) => set({ cityPreference }),
    }),
    {
      name: MAP_STORE_KEY,
      version: STORE_VERSION,
      migrate: migrateMapState,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ view, cityPreference }) => ({ view, cityPreference }),
    },
  ),
);

export function resetMapStore(): void {
  useMapStore.setState({ view: DEFAULT_VIEW, cityPreference: AUTO_CITY });
}
