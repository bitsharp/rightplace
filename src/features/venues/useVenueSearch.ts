import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { filterEvents } from '@/features/events/domain/eventList';
import { useCityEvents } from '@/features/events/hooks';
import { useWhenLabel } from '@/features/events/useEventLabels';
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

// Creators' nights shown above the venues, filtered by the same city, type and text.
function useEventRows(citySlug: string, kind: VenueKind | null, query: string) {
  const events = useCityEvents(citySlug, '');
  const whenLabel = useWhenLabel();
  return filterEvents(events.data ?? [], { kind, query }).map((event) => ({
    ...event,
    whenLabel: whenLabel(event.startsAt, event.endsAt, event.timezone),
  }));
}

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

  const eventRows = useEventRows(citySlug, kind, query);
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
  const openEvent = (eventId: string) =>
    router.push({ pathname: '/event/[id]', params: { id: eventId } });
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
    eventRows,
    openEvent,
    recents: recents.data ?? [],
    loadFailed: venues.isError,
    openVenue,
    goBack,
  };
}
