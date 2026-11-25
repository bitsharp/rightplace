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
const STORE_VERSION = 2;

type Persisted = { view?: MapViewMode; cityPreference?: CityPreference } | null;

// v0 persisted `citySlug`, which was also the default 'milano' nobody had chosen: it cannot be told
// apart from a real choice, so v0 goes back to automatic city.
// v1 saved the whole state, so the old default 'general' is not a real choice either: every state
// older than v2 moves to the Friends view once; from v2 on the saved choice is respected.
function migrateMapState(
  persisted: unknown,
  version: number,
): Pick<MapState, 'view' | 'cityPreference'> {
  const saved = persisted as Persisted;
  const cityPreference = version === 0 ? AUTO_CITY : (saved?.cityPreference ?? AUTO_CITY);
  const valid = saved?.view === 'friends' || saved?.view === 'general';
  const view = version >= STORE_VERSION && valid ? saved.view : DEFAULT_VIEW;
  return { view: view ?? DEFAULT_VIEW, cityPreference };
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
