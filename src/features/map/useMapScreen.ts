import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';

import { DEFAULT_MAX_FACES } from '@/components/app/FriendFaces';
import { isTonight } from '@/features/creator/domain/eventRow';
import { useCityEvents } from '@/features/events/hooks';
import { useSession } from '@/features/auth/useSession';
import type { LatLng } from '@/features/profile/domain/coarsen';
import { useCoarsePositionStore } from '@/features/profile/location';
import { useTopBar } from '@/features/posts/useTopBar';
import { useVenueDetail } from '@/features/venue/hooks';
import { useActiveCities } from '@/features/venues/hooks';

import type { MyDeclaration } from './api';
import { placeEventSpots, type EventSpotPlacement } from './domain/eventSpots';
import {
  buildFriendsLayers,
  buildGeneralLayers,
  featuredHotSpot,
  mapBanner,
  shownFaceIds,
  type FriendVenue,
  type HotSpotVenue,
  type MapVenue,
} from './domain/mapLayers';
import { buildOwnSpot, coordsOfVenue, type OwnSpot } from './domain/ownSpot';
import type { FeaturedCard } from './components/MapCards';
import { useCityMap, useMyDeclaration, useRecommendedVenue } from './hooks';
import { useMapStore, type MapViewMode } from './store/mapStore';
import { useCurrentCity } from './useCurrentCity';

const NO_ROWS: readonly MapVenue[] = [];
const NO_FRIEND_VENUES: FriendVenue[] = [];
const NO_IDS: string[] = [];
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

// The declared venue is drawn even when get_city_map has no row for it: then its coordinates come
// from the venue detail (catalog data, cached for an hour), never from other people's data.
function useOwnSpot(
  declaration: MyDeclaration | null | undefined,
  generalRows: readonly MapVenue[],
): OwnSpot | null {
  const mine = declaration ?? null;
  const fromMap = mine ? coordsOfVenue(generalRows, mine.venueId) : null;
  const detail = useVenueDetail(mine?.venueId ?? '', mine !== null && fromMap === null);
  const fromDetail = detail.data ? { lat: detail.data.lat, lng: detail.data.lng } : null;
  return buildOwnSpot(mine, fromMap ?? fromDetail);
}

// The card under the map: the busiest hot spot that no other card already shows, with its cover photo
// (catalog data from the venue detail, cached for an hour; never other people's data).
function useFeatured(
  view: MapViewMode,
  hotSpots: readonly HotSpotVenue[],
  covered: readonly (string | undefined)[],
): FeaturedCard | null {
  const venue =
    view === 'general'
      ? featuredHotSpot(
          hotSpots,
          covered.filter((id): id is string => id !== undefined),
        )
      : null;
  const detail = useVenueDetail(venue?.venueId ?? '', venue !== null);
  return venue ? { venue, photoUrl: detail.data?.photoUrl ?? null } : null;
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
  const { view, setView } = useMapStore();
  const citySlug = useCurrentCity();
  const cities = useActiveCities();
  const { layers, generalRows, loaded, loadFailed } = useMapLayers(citySlug, view);
  // One batch for the whole screen (top bar and friends map); the general map asks for no friend photo at all.
  const friendIds = useMemo(
    () => (view === 'friends' ? shownFaceIds(layers.friendVenues, DEFAULT_MAX_FACES) : NO_IDS),
    [view, layers.friendVenues],
  );
  const topBar = useTopBar(friendIds);
  const eventSpots = useEventSpots(citySlug, view, layers.hotSpots);
  const declaration = useMyDeclaration();
  const recommended = useRecommendedVenue(citySlug);
  const ownSpot = useOwnSpot(declaration.data, generalRows);
  const sponsored = generalRows.find((row) => row.isSponsored) ?? null;
  const featured = useFeatured(view, layers.hotSpots, [
    declaration.data?.venueId,
    sponsored?.venueId,
  ]);
  const coarseCell = useCoarsePositionStore((state) => state.cell);
  const openVenue = useOpenVenue();
  // The point chosen with a 3 s press: while set, the "serata in questo punto" sheet is open.
  const [spotPoint, setSpotPoint] = useState<LatLng | null>(null);

  return {
    view,
    setView,
    city: cities.data?.find((city) => city.slug === citySlug) ?? null,
    layers,
    eventSpots,
    ownSpot,
    loaded,
    loadFailed,
    // Only a user who turned the toggle on ever has a cell; it is already ~500 m coarse.
    you: profile?.locationOptIn ? coarseCell : null,
    banner: view === 'general' && loaded ? mapBanner(layers) : 'none',
    featured,
    sponsored,
    recommended: recommended.data ?? null,
    declaration: declaration.data ?? null,
    topBar,
    avatarUrls: topBar.avatarUrls,
    openVenue,
    spotPoint,
    pickSpot: setSpotPoint,
    closeSpot: () => setSpotPoint(null),
    openEvent: (eventId: string) =>
      router.push({ pathname: '/event/[id]', params: { id: eventId } }),
    openSearch: () => router.push('/search'),
    openLocationSettings: () => router.push('/profile/privacy'),
  };
}
