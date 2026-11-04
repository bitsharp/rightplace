import type { Band } from '@/features/nights/domain/band';
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
  goingBand: Band;
  maybeBand: Band;
  isHotSpot: boolean;
  isSponsored: boolean;
  friendsGoing: string[] | null;
  friendsCount: number | null;
};

export type FriendVenue = { venueId: string; name: string; handles: string[]; count: number };

export type MapLayers = { hotSpots: MapVenue[]; typicalDots: MapVenue[] };
export type FriendsMapLayers = MapLayers & { friendVenues: FriendVenue[] };
export type MapBanner = 'none' | 'typicalOnly' | 'empty';

const hasTypical = (row: MapVenue) => row.typicalLevel >= 1;

// "Stasera" covers "di solito": a venue is a hot spot or a grey dot, never both (principle 11).
export function buildGeneralLayers(rows: readonly MapVenue[]): MapLayers {
  return {
    hotSpots: rows.filter((row) => row.isHotSpot),
    typicalDots: rows.filter((row) => !row.isHotSpot && hasTypical(row)),
  };
}

const friendsOf = (row: MapVenue) => row.friendsCount ?? 0;

function toFriendVenue(row: MapVenue): FriendVenue {
  return {
    venueId: row.venueId,
    name: row.name,
    handles: row.friendsGoing ?? [],
    count: friendsOf(row),
  };
}

export function buildFriendsLayers(
  friendRows: readonly MapVenue[],
  generalRows: readonly MapVenue[],
): FriendsMapLayers {
  const hotSpots = friendRows.filter((row) => friendsOf(row) > 0);
  const hotSpotIds = new Set(hotSpots.map((row) => row.venueId));
  return {
    hotSpots,
    typicalDots: generalRows.filter((row) => hasTypical(row) && !hotSpotIds.has(row.venueId)),
    friendVenues: hotSpots
      .map(toFriendVenue)
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'it')),
  };
}

export function mapBanner(layers: MapLayers): MapBanner {
  if (layers.hotSpots.length > 0) return 'none';
  return layers.typicalDots.length > 0 ? 'typicalOnly' : 'empty';
}
