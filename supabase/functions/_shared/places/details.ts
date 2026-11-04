import { placeToRow } from './textSearch.ts';
import type { VenueKind, VenueRow } from './types.ts';

// Minimal field mask for Place Details (New): identifiers and the fields the app shows.
export const DETAILS_FIELD_MASK = 'id,displayName,location,formattedAddress,regularOpeningHours';

const REFRESH_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

// Places terms: cached content lives at most 30 days, and Details is billed per call,
// so a venue is refreshed on demand at most once every 30 days.
export function shouldRefresh(syncedAt: Date | null, now: Date): boolean {
  if (syncedAt === null) return true;
  return now.getTime() - syncedAt.getTime() >= REFRESH_AFTER_MS;
}

// Demo seed venues have no Google place behind them.
export function isRealPlaceId(placeId: string): boolean {
  return !placeId.startsWith('demo-');
}

export function buildDetailsRequest(
  placeId: string,
  apiKey: string,
  languageCode = 'it',
): { url: string; init: RequestInit } {
  return {
    url: `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=${languageCode}`,
    init: {
      method: 'GET',
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': DETAILS_FIELD_MASK },
    },
  };
}

export function detailsToRow(place: unknown, kind: VenueKind): VenueRow | null {
  return placeToRow(place, kind);
}
