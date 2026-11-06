import { useQuery } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';

import { RpcError } from '@/lib/rpcError';

import { fetchCityEvents, fetchEventDetail } from './api';

export const CITY_EVENTS_REFETCH_MS = 60 * 1000;
export const EVENT_DETAIL_REFETCH_MS = 60 * 1000;

// Bands move all evening and say who is going where: in memory only, never on disk.
const PRIVATE = { persist: false } as const;

// An event that is gone (or whose venue was switched off) will not come back by retrying.
const retryUnlessMissing = (failures: number, error: unknown) =>
  !(error instanceof RpcError && error.code === 'NOT_FOUND') && failures < 3;

export function useCityEvents(citySlug: string, query: string, days?: number) {
  const focused = useIsFocused();
  return useQuery({
    queryKey: ['cityEvents', citySlug, query, days ?? null],
    queryFn: () => fetchCityEvents(citySlug, query, days),
    enabled: citySlug !== '',
    refetchInterval: focused ? CITY_EVENTS_REFETCH_MS : false,
    refetchOnWindowFocus: true,
    meta: PRIVATE,
  });
}

export function useEventDetail(eventId: string) {
  const focused = useIsFocused();
  return useQuery({
    queryKey: ['eventDetail', eventId],
    queryFn: () => fetchEventDetail(eventId),
    refetchInterval: focused ? EVENT_DETAIL_REFETCH_MS : false,
    refetchOnWindowFocus: true,
    retry: retryUnlessMissing,
    meta: PRIVATE,
  });
}
