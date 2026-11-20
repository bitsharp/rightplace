import { isSearchLanguage, isSessionToken } from './search.ts';
import { mapKind, placeToRow } from './textSearch.ts';
import type { DetailsRow, SearchLanguage, SelectionRow, VenueKind } from './types.ts';

// Minimal field mask for Place Details (New): identifiers and the fields the app shows. regularOpeningHours already
// makes this call Enterprise, and websiteUri is billed in the same tier: adding it does not change the cost per call.
// It must NOT go into the Text Search mask or the Pro selection mask below: there it would raise the SKU.
export const DETAILS_FIELD_MASK =
  'id,displayName,location,formattedAddress,regularOpeningHours,websiteUri';

const REFRESH_AFTER_MS = 30 * 24 * 60 * 60 * 1000;

// Places terms: cached content lives at most 30 days, and Details is billed per call,
// so a venue is refreshed on demand at most once every 30 days.
export function shouldRefresh(syncedAt: Date | null, now: Date): boolean {
  if (syncedAt === null) return true;
  return now.getTime() - syncedAt.getTime() >= REFRESH_AFTER_MS;
}

// Demo seed venues and user spots ('spot:<uuid>') have no Google place behind them.
export function isRealPlaceId(placeId: string): boolean {
  return !placeId.startsWith('demo-') && !placeId.startsWith('spot:');
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

const WEBSITE = /^https?:\/\/\S+$/i;
const MAX_WEBSITE_LENGTH = 2048;

// Only http(s) links are kept: anything else (javascript:, tel:, bare text) is dropped, the app only ever opens web links.
function toWebsite(value: unknown): string | null {
  return typeof value === 'string' && value.length <= MAX_WEBSITE_LENGTH && WEBSITE.test(value)
    ? value
    : null;
}

export function detailsToRow(place: unknown, kind: VenueKind): DetailsRow | null {
  const row = placeToRow(place, kind);
  if (row === null) return null;
  return { ...row, website_uri: toWebsite((place as { websiteUri?: unknown }).websiteUri) };
}

// Place Details Pro: no regularOpeningHours (that field moves the call to Enterprise). Opening hours stay with the
// venue detail screen and its own 30-day refresh.
export const SELECTION_FIELD_MASK = 'id,displayName,formattedAddress,location,types,primaryType';

// The sessionToken closes the Autocomplete session: its requests are then not billed.
export function buildSelectionDetailsRequest(
  placeId: string,
  apiKey: string,
  sessionToken: string,
  languageCode: SearchLanguage,
): { url: string; init: RequestInit } {
  const query = `languageCode=${languageCode}&sessionToken=${encodeURIComponent(sessionToken)}`;
  return {
    url: `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?${query}`,
    init: {
      method: 'GET',
      headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': SELECTION_FIELD_MASK },
    },
  };
}

export type SelectionInput = {
  placeId: string;
  sessionToken: string;
  citySlug: string;
  language: SearchLanguage;
};

export function parseSelectionInput(body: unknown): SelectionInput | null {
  if (typeof body !== 'object' || body === null) return null;
  const {
    place_id: placeId,
    session_token: sessionToken,
    city_slug: citySlug,
    language,
  } = body as Record<string, unknown>;
  if (
    typeof placeId !== 'string' ||
    placeId === '' ||
    placeId.length > 300 ||
    !isRealPlaceId(placeId)
  )
    return null;
  if (!isSessionToken(sessionToken)) return null;
  if (typeof citySlug !== 'string' || citySlug === '' || citySlug.length > 60) return null;
  if (language !== undefined && !isSearchLanguage(language)) return null;
  return { placeId, sessionToken, citySlug, language: language ?? 'it' };
}

// Businesses get their mapped kind; for anything else the DB decides (address → spot) from `types`.
export function selectionToRow(place: unknown): SelectionRow | null {
  const base = placeToRow(place, 'other');
  if (base === null) return null;
  const record = place as { types?: unknown; primaryType?: unknown };
  const types = Array.isArray(record.types)
    ? record.types.filter((type): type is string => typeof type === 'string')
    : [];
  const primaryType = typeof record.primaryType === 'string' ? record.primaryType : undefined;
  return {
    google_place_id: base.google_place_id,
    name: base.name,
    kind: mapKind(primaryType, 'other'),
    lat: base.lat,
    lng: base.lng,
    address: base.address,
    types,
  };
}
