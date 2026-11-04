import type { LatLng, SyncCity, VenueKind, VenueRow } from './types.ts';

// Minimal field mask: every extra field would raise the Places SKU (and the bill).
export const PLACES_FIELD_MASK =
  'places.id,places.displayName,places.location,places.formattedAddress,places.primaryType,places.regularOpeningHours';

const TEXT_SEARCH_URL = 'https://places.googleapis.com/v1/places:searchText';
const PAGE_SIZE = 20;

export type SyncQuery = { kind: VenueKind; textQuery: string; includedType?: string };

type Vocabulary = { club: string; bar: string; rooftop: string; live: string };

const VOCABULARY: Record<string, Vocabulary> = {
  it: { club: 'discoteca', bar: 'cocktail bar', rooftop: 'rooftop bar', live: 'musica dal vivo' },
  es: { club: 'discoteca', bar: 'bar de copas', rooftop: 'azotea bar', live: 'música en directo' },
  en: { club: 'night club', bar: 'cocktail bar', rooftop: 'rooftop bar', live: 'live music' },
};

const INCLUDED_TYPE: Partial<Record<VenueKind, string>> = {
  club: 'night_club',
  bar: 'bar',
  live: 'live_music_venue',
};

const GENERIC_KINDS: VenueKind[] = ['club', 'bar', 'rooftop', 'live'];
// Neighbourhood queries alternate bars and clubs: that is where nightlife clusters.
const AREA_KINDS: VenueKind[] = ['bar', 'club'];
export const HARD_MAX_REQUESTS = 20;

export function languageFor(country: string): 'it' | 'es' | 'en' {
  if (country === 'IT') return 'it';
  if (country === 'ES') return 'es';
  return 'en';
}

function query(kind: VenueKind, vocabulary: Vocabulary, suffix: string): SyncQuery {
  const textQuery = `${vocabulary[kind as keyof Vocabulary]} ${suffix}`;
  const includedType = INCLUDED_TYPE[kind];
  return includedType ? { kind, textQuery, includedType } : { kind, textQuery };
}

// Built only from the cities row (name, country, areas): activating a city needs no code.
export function queriesForCity(city: SyncCity, maxRequests: number): SyncQuery[] {
  const vocabulary = VOCABULARY[languageFor(city.country)] as Vocabulary;
  const generic = GENERIC_KINDS.map((kind) => query(kind, vocabulary, city.name));
  const perArea = city.areas.map((area, index) =>
    query(AREA_KINDS[index % AREA_KINDS.length] as VenueKind, vocabulary, `${area} ${city.name}`),
  );
  return [...generic, ...perArea].slice(0, Math.min(maxRequests, HARD_MAX_REQUESTS));
}

export function buildTextSearchRequest(
  query: SyncQuery,
  center: LatLng,
  apiKey: string,
  radiusM: number,
  languageCode: string,
): { url: string; init: RequestInit } {
  const body = {
    textQuery: query.textQuery,
    ...(query.includedType ? { includedType: query.includedType } : {}),
    locationBias: {
      circle: { center: { latitude: center.lat, longitude: center.lng }, radius: radiusM },
    },
    languageCode,
    pageSize: PAGE_SIZE,
  };
  return {
    url: TEXT_SEARCH_URL,
    init: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': PLACES_FIELD_MASK,
      },
      body: JSON.stringify(body),
    },
  };
}

const BAR_TYPES = new Set(['bar', 'cocktail_bar', 'wine_bar', 'pub', 'lounge_bar']);
const LIVE_TYPES = new Set(['live_music_venue', 'concert_hall']);

export function mapKind(primaryType: string | undefined, queryKind: VenueKind): VenueKind {
  if (queryKind === 'rooftop') return 'rooftop';
  if (primaryType === 'night_club') return 'club';
  if (primaryType && BAR_TYPES.has(primaryType)) return 'bar';
  if (primaryType && LIVE_TYPES.has(primaryType)) return 'live';
  return queryKind;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Returns null for places without id, name or numeric coordinates.
export function placeToRow(place: unknown, queryKind: VenueKind): VenueRow | null {
  if (!isRecord(place)) return null;
  const { id, displayName, location } = place;
  const name = isRecord(displayName) ? displayName.text : undefined;
  if (typeof id !== 'string' || id === '' || typeof name !== 'string' || name === '') return null;
  if (!isRecord(location)) return null;
  const { latitude, longitude } = location;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  const primaryType = typeof place.primaryType === 'string' ? place.primaryType : undefined;
  return {
    google_place_id: id,
    name,
    kind: mapKind(primaryType, queryKind),
    lat: latitude,
    lng: longitude,
    address: typeof place.formattedAddress === 'string' ? place.formattedAddress : null,
    opening_hours: place.regularOpeningHours ?? null,
  };
}

export function toVenueRows(response: unknown, queryKind: VenueKind): VenueRow[] {
  if (!isRecord(response) || !Array.isArray(response.places)) return [];
  const rows = new Map<string, VenueRow>();
  for (const place of response.places) {
    const row = placeToRow(place, queryKind);
    if (row && !rows.has(row.google_place_id)) rows.set(row.google_place_id, row);
  }
  return [...rows.values()];
}
