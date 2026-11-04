import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { useMapStore } from '@/features/map/store/mapStore';

import {
  filterVenues,
  mergeVenueBands,
  sortVenues,
  type VenueBands,
  type VenueKind,
} from './domain/venueList';
import {
  useActiveCities,
  useCityVenues,
  useRecentVenues,
  useRememberVenue,
  useVenueBands,
} from './hooks';

const NO_BANDS: ReadonlyMap<string, VenueBands> = new Map();

export function useVenueSearch() {
  const router = useRouter();
  // Same city as the map: one source of truth in the persisted map store.
  const { citySlug, setCitySlug } = useMapStore();
  const [kind, setKind] = useState<VenueKind | null>(null);
  const [query, setQuery] = useState('');
  const cities = useActiveCities();
  const venues = useCityVenues(citySlug);
  const bands = useVenueBands(citySlug);
  const recents = useRecentVenues();
  const remember = useRememberVenue();

  const rows = useMemo(
    () =>
      sortVenues(
        filterVenues(mergeVenueBands(venues.data ?? [], bands.data ?? NO_BANDS), { kind, query }),
      ),
    [venues.data, bands.data, kind, query],
  );

  const openVenue = (venueId: string) => {
    remember.mutate(venueId);
    router.push({ pathname: '/venue/[id]', params: { id: venueId } });
  };
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/map'));

  return {
    cities: cities.data ?? [],
    citySlug,
    setCitySlug,
    kind,
    setKind,
    query,
    setQuery,
    rows,
    recents: recents.data ?? [],
    loadFailed: venues.isError,
    openVenue,
    goBack,
  };
}
