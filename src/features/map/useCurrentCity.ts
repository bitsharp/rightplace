import { useMemo } from 'react';

import { useSession } from '@/features/auth/useSession';
import { DEFAULT_CITY_SLUG } from '@/features/profile/api';
import { useCoarsePositionStore } from '@/features/profile/location';
import { useActiveCities } from '@/features/venues/hooks';

import { nearestActiveCity, resolveCity } from './domain/cityChoice';
import { useMapStore } from './store/mapStore';

// The one place that decides which city the app is about (map, search, events, notifications):
// the user's explicit choice, else the city nearest to the coarse cell, else the default.
// It only reads the in-memory cell: it never asks for the location permission (principle 3).
export function useCurrentCity(): string {
  const preference = useMapStore((state) => state.cityPreference);
  const cell = useCoarsePositionStore((state) => state.cell);
  const cities = useActiveCities().data;
  const profileCity = useSession().profile?.citySlug ?? null;
  return useMemo(
    () =>
      resolveCity({
        preference,
        detected: cell && cities ? nearestActiveCity(cell, cities) : null,
        profileCity,
        fallback: DEFAULT_CITY_SLUG,
        activeSlugs: cities ? cities.map((city) => city.slug) : null,
      }),
    [preference, cell, cities, profileCity],
  );
}
