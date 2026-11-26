import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { AUTO_CITY, type CityPreference } from '../domain/cityChoice';

export type MapViewMode = 'general' | 'friends';

const DEFAULT_VIEW: MapViewMode = 'general';

type MapState = {
  // The preference chosen in the settings ("Mappa all'avvio"): persisted.
  defaultView: MapViewMode;
  // The view shown right now: it starts from defaultView on every launch and is never persisted,
  // so the Mappe/Amici toggle on the map only changes the current session.
  view: MapViewMode;
  // True once the toggle was used in this session: from then on the preference no longer moves the view.
  viewTouched: boolean;
  // 'auto' (default) or the slug the user chose. The city actually shown comes from
  // useCurrentCity(): nobody reads this field directly.
  cityPreference: CityPreference;
  setView: (view: MapViewMode) => void;
  setDefaultView: (defaultView: MapViewMode) => void;
  setCityPreference: (cityPreference: CityPreference) => void;
};

export const MAP_STORE_KEY = 'rightplace.map';
const STORE_VERSION = 3;

type Persisted = { defaultView?: MapViewMode; cityPreference?: CityPreference } | null;
type PersistedState = Pick<MapState, 'defaultView' | 'cityPreference'>;

const isView = (value: unknown): value is MapViewMode => value === 'friends' || value === 'general';

// v0 persisted `citySlug`, which was also the default 'milano' nobody had chosen: it cannot be told
// apart from a real choice, so v0 goes back to automatic city.
// Before v3 the "view" was the last toggle, not a preference: every older state restarts once from
// the general map (decision of Luca); from v3 on the saved preference is respected.
function migrateMapState(persisted: unknown, version: number): PersistedState {
  const saved = persisted as Persisted;
  const cityPreference = version === 0 ? AUTO_CITY : (saved?.cityPreference ?? AUTO_CITY);
  const defaultView =
    version >= STORE_VERSION && isView(saved?.defaultView) ? saved.defaultView : DEFAULT_VIEW;
  return { defaultView, cityPreference };
}

// UI preferences only.
export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      defaultView: DEFAULT_VIEW,
      view: DEFAULT_VIEW,
      viewTouched: false,
      cityPreference: AUTO_CITY,
      setView: (view) => set({ view, viewTouched: true }),
      setDefaultView: (defaultView) =>
        set((state) => (state.viewTouched ? { defaultView } : { defaultView, view: defaultView })),
      setCityPreference: (cityPreference) => set({ cityPreference }),
    }),
    {
      name: MAP_STORE_KEY,
      version: STORE_VERSION,
      migrate: migrateMapState,
      // The launch view comes from the saved preference, unless the user already used the toggle.
      merge: (persisted, current) => {
        const saved = persisted as Partial<PersistedState> | undefined;
        const defaultView = isView(saved?.defaultView) ? saved.defaultView : current.defaultView;
        return {
          ...current,
          ...saved,
          defaultView,
          view: current.viewTouched ? current.view : defaultView,
        };
      },
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ defaultView, cityPreference }) => ({ defaultView, cityPreference }),
    },
  ),
);

export function resetMapStore(): void {
  useMapStore.setState({
    defaultView: DEFAULT_VIEW,
    view: DEFAULT_VIEW,
    viewTouched: false,
    cityPreference: AUTO_CITY,
  });
}
