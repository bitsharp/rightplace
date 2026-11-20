export type VenueKind = 'club' | 'rooftop' | 'bar' | 'live' | 'other';

export type LatLng = { lat: number; lng: number };

// Row accepted by the SQL function public.sync_places_venues.
export type VenueRow = {
  google_place_id: string;
  name: string;
  kind: VenueKind;
  lat: number;
  lng: number;
  address: string | null;
  opening_hours: unknown;
};

// Place Details row: the Text Search row plus the venue website (Details only: it is not in the Text Search mask).
export type DetailsRow = VenueRow & { website_uri: string | null };

// Everything comes from the cities row: nothing is hard-wired per city.
export type SyncCity = {
  slug: string;
  name: string;
  country: string;
  center: LatLng;
  radiusM: number;
  areas: string[];
};

export type UpsertCounts = { inserted: number; updated: number; demoDeactivated: number };

export type SyncResult = UpsertCounts & { calls: number };

// Row accepted by the SQL function public.upsert_search_place (search selection, Details Pro).
export type SelectionRow = {
  google_place_id: string;
  name: string;
  kind: VenueKind;
  lat: number;
  lng: number;
  address: string | null;
  types: string[];
};

export type SearchLanguage = 'it' | 'en';

export type SearchCity = { center: LatLng; radiusM: number; country: string };

export type PlaceSuggestion = {
  placeId: string;
  primaryText: string;
  secondaryText: string;
  types: string[];
};
