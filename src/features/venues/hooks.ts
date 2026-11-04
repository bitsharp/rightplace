import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchActiveCities,
  fetchCityVenues,
  fetchRecentVenues,
  fetchVenueBands,
  rememberVenue,
} from './api';

const ONE_HOUR_MS = 60 * 60 * 1000;
const BANDS_REFETCH_MS = 60 * 1000;
const RECENT_KEY = ['search-history'] as const;

export function useActiveCities() {
  return useQuery({ queryKey: ['cities'], queryFn: fetchActiveCities, staleTime: ONE_HOUR_MS });
}

// The catalog changes rarely: cached (and persisted) for an hour, searched client-side.
export function useCityVenues(citySlug: string) {
  return useQuery({
    queryKey: ['venues', citySlug],
    queryFn: () => fetchCityVenues(citySlug),
    staleTime: ONE_HOUR_MS,
  });
}

// Tonight's bands move all evening; a Map is not serializable, so they never reach the disk cache.
export function useVenueBands(citySlug: string) {
  return useQuery({
    queryKey: ['venues', citySlug, 'bands'],
    queryFn: () => fetchVenueBands(citySlug),
    refetchInterval: BANDS_REFETCH_MS,
    meta: { persist: false },
  });
}

export function useRecentVenues() {
  return useQuery({ queryKey: RECENT_KEY, queryFn: fetchRecentVenues, meta: { persist: false } });
}

export function useRememberVenue() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: rememberVenue,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: RECENT_KEY }),
  });
}
