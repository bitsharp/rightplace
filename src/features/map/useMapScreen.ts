import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef } from 'react';

import { isTonight } from '@/features/creator/domain/eventRow';
import { useCityEvents } from '@/features/events/hooks';
import { useSession } from '@/features/auth/useSession';
import { useCoarsePositionStore } from '@/features/profile/location';
import { useTopBar } from '@/features/posts/useTopBar';
import { useActiveCities } from '@/features/venues/hooks';

import { placeEventSpots, type EventSpotPlacement } from './domain/eventSpots';
import {
  buildFriendsLayers,
  buildGeneralLayers,
  mapBanner,
  type FriendVenue,
  type MapVenue,
} from './domain/mapLayers';
import { useCityMap, useMyDeclaration, useRecommendedVenue } from './hooks';
import { useMapStore, type MapViewMode } from './store/mapStore';

const NO_ROWS: readonly MapVenue[] = [];
const NO_FRIEND_VENUES: FriendVenue[] = [];
// Marker and child both report a tap on some devices: one navigation per venue is enough.
const DOUBLE_TAP_MS = 600;

function useOpenVenue() {
  const router = useRouter();
  const last = useRef({ venueId: '', at: 0 });
  return useCallback(
    (venueId: string) => {
      const now = Date.now();
      if (last.current.venueId === venueId && now - last.current.at < DOUBLE_TAP_MS) return;
      last.current = { venueId, at: now };
      router.push({ pathname: '/venue/[id]', params: { id: venueId } });
    },
    [router],
  );
}

const NO_SPOTS: EventSpotPlacement[] = [];

// Creators' nights of the current night, only on the general map ("stasera" layer, principle 11):
// the friends map is about where friends go, which an event alone does not say.
function useEventSpots(citySlug: string, view: MapViewMode, hotSpots: readonly MapVenue[]) {
  const events = useCityEvents(citySlug, '', 1);
  return useMemo(() => {
    if (view !== 'general' || !events.data) return NO_SPOTS;
    const now = new Date();
    const tonight = events.data.filter((event) => isTonight(event.startsAt, now, event.timezone));
    return placeEventSpots(tonight, new Set(hotSpots.map((spot) => spot.venueId)));
  }, [view, events.data, hotSpots]);
}

function useMapLayers(citySlug: string, view: MapViewMode) {
  const general = useCityMap(citySlug, 'general');
  const friends = useCityMap(citySlug, 'friends', view === 'friends');
  const generalRows = general.data ?? NO_ROWS;
  const layers = useMemo(
    () =>
      view === 'friends'
        ? buildFriendsLayers(friends.data ?? NO_ROWS, generalRows)
        : { ...buildGeneralLayers(generalRows), friendVenues: NO_FRIEND_VENUES },
    [view, friends.data, generalRows],
  );
  return {
    layers,
    generalRows,
    loaded: view === 'friends' ? friends.isSuccess : general.isSuccess,
    loadFailed: general.isError || (view === 'friends' && friends.isError),
  };
}

export function useMapScreen() {
  const router = useRouter();
  const { profile } = useSession();
  const { view, setView, citySlug } = useMapStore();
  const cities = useActiveCities();
  const { layers, generalRows, loaded, loadFailed } = useMapLayers(citySlug, view);
  const eventSpots = useEventSpots(citySlug, view, layers.hotSpots);
  const declaration = useMyDeclaration();
  const recommended = useRecommendedVenue(citySlug);
  const coarseCell = useCoarsePositionStore((state) => state.cell);
  const openVenue = useOpenVenue();

  return {
    view,
    setView,
    city: cities.data?.find((city) => city.slug === citySlug) ?? null,
    layers,
    eventSpots,
    loaded,
    loadFailed,
    // Only a user who turned the toggle on ever has a cell; it is already ~500 m coarse.
    you: profile?.locationOptIn ? coarseCell : null,
    banner: view === 'general' && loaded ? mapBanner(layers) : 'none',
    sponsored: generalRows.find((row) => row.isSponsored) ?? null,
    recommended: recommended.data ?? null,
    declaration: declaration.data ?? null,
    topBar: useTopBar(),
    openVenue,
    openEvent: (eventId: string) =>
      router.push({ pathname: '/event/[id]', params: { id: eventId } }),
    openSearch: () => router.push('/search'),
  };
}
