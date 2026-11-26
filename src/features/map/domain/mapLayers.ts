import { bandRank, type Band } from '@/features/nights/domain/band';
import type { VenueKind } from '@/features/venues/domain/venueList';

import type { TypicalLevel } from './typical';

// One validated row of get_city_map. Bands are already k-anonymous (principle 2).
export type MapVenue = {
  venueId: string;
  name: string;
  kind: VenueKind;
  lat: number;
  lng: number;
  typicalLevel: TypicalLevel;
  // null only for a spot below k = 3: no number at all, not even "pochi" (principle 2).
  goingBand: Band | null;
  maybeBand: Band | null;
  isHotSpot: boolean;
  isSponsored: boolean;
  friendsGoing: string[] | null;
  // Aligned with friendsGoing; only used to ask for their photos (the server decides who is visible).
  friendIds: string[] | null;
  friendsCount: number | null;
  isSpot: boolean;
};

// A hot spot always has bands: the type says so, so no marker can print a made-up "pochi".
export type HotSpotVenue = MapVenue & { goingBand: Band; maybeBand: Band };

export type FriendVenue = {
  venueId: string;
  name: string;
  handles: string[];
  friendIds: string[];
  count: number;
};

// The grey "di solito" layer is not drawn (Luca, 26/11/2026): the map shows only hot spots (real + estimated), spots,
// events and "Tu". The typical level stays on the row for the texts of the cards.
export type MapLayers = { hotSpots: HotSpotVenue[]; spots: MapVenue[] };
export type FriendsMapLayers = MapLayers & { friendVenues: FriendVenue[] };

const hasBands = (row: MapVenue): row is HotSpotVenue =>
  row.goingBand !== null && row.maybeBand !== null;

const isHotSpotRow = (row: MapVenue): row is HotSpotVenue => row.isHotSpot && hasBands(row);

// A spot below k is a "stasera" marker without numbers; from k on it is a normal hot spot.
const isBareSpot = (row: MapVenue) => row.isSpot && !isHotSpotRow(row);

// A row is a hot spot or a bare spot or nothing: rows with only a "di solito" level draw no marker.
export function buildGeneralLayers(rows: readonly MapVenue[]): MapLayers {
  return {
    hotSpots: rows.filter(isHotSpotRow),
    spots: rows.filter(isBareSpot),
  };
}

const friendsOf = (row: MapVenue) => row.friendsCount ?? 0;

function toFriendVenue(row: MapVenue): FriendVenue {
  return {
    venueId: row.venueId,
    name: row.name,
    handles: row.friendsGoing ?? [],
    friendIds: row.friendIds ?? [],
    count: friendsOf(row),
  };
}

export function buildFriendsLayers(friendRows: readonly MapVenue[]): FriendsMapLayers {
  const withFriends = friendRows.filter((row) => friendsOf(row) > 0);
  const hotSpots = withFriends.filter(hasBands);
  const spots = withFriends.filter((row) => !hasBands(row));
  return {
    hotSpots,
    spots,
    friendVenues: withFriends
      .map(toFriendVenue)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'it')),
  };
}

// Handles and ids come aligned from get_city_map; a mismatch (older server) just shows fewer faces.
export function friendFacesOf(
  handles: readonly string[],
  friendIds: readonly string[] | null,
): { userId: string; handle: string }[] {
  const ids = friendIds ?? [];
  return handles
    .slice(0, ids.length)
    .map((handle, index) => ({ userId: ids[index] ?? '', handle }));
}

// The venue the bottom card talks about: the busiest by "Ci vado" band, then by name so it does not flip
// between refreshes. Venues already shown by another card are skipped.
export function featuredHotSpot(
  hotSpots: readonly HotSpotVenue[],
  excludeIds: readonly string[],
): HotSpotVenue | null {
  const [first] = hotSpots
    .filter((spot) => !excludeIds.includes(spot.venueId))
    .sort(
      (a, b) => bandRank(b.goingBand) - bandRank(a.goingBand) || a.name.localeCompare(b.name, 'it'),
    );
  return first ?? null;
}

// The people whose photo a row or marker draws (the first faces only): the batch asks for these, so a venue
// with many friends never pushes the visible ones out of the request.
export function shownFaceIds(
  rows: readonly { friendIds: readonly string[] | null }[],
  perRow: number,
): string[] {
  return rows.flatMap((row) => (row.friendIds ?? []).slice(0, perRow));
}
