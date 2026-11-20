import { useMemo } from 'react';

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
  return useMemo(
    () =>
      resolveCity({
        preference,
        detected: cell && cities ? nearestActiveCity(cell, cities) : null,
        // profiles.city_id is not exposed to the client and complete_profile always writes the default
        profileCity: null,
        fallback: DEFAULT_CITY_SLUG,
        activeSlugs: cities ? cities.map((city) => city.slug) : null,
      }),
    [preference, cell, cities],
  );
}
