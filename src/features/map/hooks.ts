import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useEffect, useRef } from 'react';

import { fetchCityMap, fetchMyDeclaration, fetchRecommendedVenue, fetchStories } from './api';
import type { MapViewMode } from './store/mapStore';

export const CITY_MAP_REFETCH_MS = 60 * 1000;

export const cityMapKey = (citySlug: string, view: MapViewMode) =>
  ['cityMap', citySlug, view] as const;
export const MY_DECLARATION_KEY = ['myDeclaration'] as const;

// Tonight's turnout moves all evening: poll while the screen is in front and reload when it
// comes back. Never persisted: yesterday's map must not be shown as today's.
export function useCityMap(citySlug: string, view: MapViewMode, enabled = true) {
  const focused = useIsFocused();
  const query = useQuery({
    queryKey: cityMapKey(citySlug, view),
    queryFn: () => fetchCityMap(citySlug, view),
    enabled,
    refetchInterval: focused ? CITY_MAP_REFETCH_MS : false,
    refetchOnWindowFocus: true,
    meta: { persist: false },
  });
  const { refetch } = query;
  const wasFocused = useRef(focused);
  useEffect(() => {
    if (focused && !wasFocused.current && enabled) void refetch();
    wasFocused.current = focused;
  }, [focused, enabled, refetch]);
  return query;
}

export function useMyDeclaration() {
  return useQuery({
    queryKey: MY_DECLARATION_KEY,
    queryFn: fetchMyDeclaration,
    meta: { persist: false },
  });
}

export function useStories() {
  return useQuery({ queryKey: ['stories'], queryFn: fetchStories, meta: { persist: false } });
}

export function useRecommendedVenue(citySlug: string) {
  return useQuery({
    queryKey: ['recommendedVenue', citySlug],
    queryFn: () => fetchRecommendedVenue(citySlug),
    meta: { persist: false },
  });
}
