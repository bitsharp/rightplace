import type { Intent } from '@/features/nights/domain/band';
import type { LatLng } from '@/features/profile/domain/coarsen';

import type { MyDeclaration } from '../api';

import type { MapVenue } from './mapLayers';

// My own plan tonight, drawn on the map whatever the turnout: it is my data, not an aggregate about
// others, so the k >= 3 rule does not apply (principle 2). It belongs to the "stasera" layer.
export type OwnSpot = { venueId: string; name: string; intent: Intent } & LatLng;

export function coordsOfVenue(rows: readonly MapVenue[], venueId: string): LatLng | null {
  const row = rows.find((candidate) => candidate.venueId === venueId);
  return row ? { lat: row.lat, lng: row.lng } : null;
}

export function buildOwnSpot(
  declaration: MyDeclaration | null,
  coords: LatLng | null,
): OwnSpot | null {
  if (!declaration || !coords) return null;
  return {
    venueId: declaration.venueId,
    name: declaration.venueName,
    intent: declaration.intent,
    lat: coords.lat,
    lng: coords.lng,
  };
}
