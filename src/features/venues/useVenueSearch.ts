import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';

import { filterEvents } from '@/features/events/domain/eventList';
import { useCityEvents } from '@/features/events/hooks';
import { useWhenLabel } from '@/features/events/useEventLabels';
import { useCurrentCity } from '@/features/map/useCurrentCity';
import { useMapStore } from '@/features/map/store/mapStore';

import { withoutCatalogDuplicates } from './domain/googleResults';
import type { GoogleSuggestion } from './googleApi';
import { useGoogleSearch } from './useGoogleSearch';
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
  // Same city as the map (useCurrentCity); picking one here is an explicit choice, like in the profile.
  const citySlug = useCurrentCity();
  const setCitySlug = useMapStore((state) => state.setCityPreference);
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

  // Google results come after the catalog rows; a place that is already a shown row is not repeated.
  const google = useGoogleSearch(query, citySlug);
  const shownIds = new Set(rows.map((row) => row.id));
  const googleRows = withoutCatalogDuplicates(
    google.suggestions,
    (venues.data ?? []).filter((venue) => shownIds.has(venue.id)),
  );

  const openVenue = (venueId: string) => {
    remember.mutate(venueId);
    router.push({ pathname: '/venue/[id]', params: { id: venueId } });
  };
  const openGoogle = async (suggestion: GoogleSuggestion) => {
    const venueId = await google.select(suggestion);
    if (venueId) router.push({ pathname: '/venue/[id]', params: { id: venueId } });
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
    google: {
      status: google.status,
      rows: googleRows,
      selectError: google.selectError,
      selecting: google.selecting,
      open: openGoogle,
    },
    eventRows,
    openEvent,
    recents: recents.data ?? [],
    loadFailed: venues.isError,
    openVenue,
    goBack,
  };
}
