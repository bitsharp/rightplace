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
