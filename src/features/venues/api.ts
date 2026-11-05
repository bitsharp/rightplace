import { z } from 'zod';

import { BANDS } from '@/features/nights/domain/band';
import { callRpc } from '@/lib/callRpc';
import { RpcError, toRpcErrorCode } from '@/lib/rpcError';
import { supabase } from '@/lib/supabase';

import { parseRecentVenues, MAX_RECENT_VENUES, type RecentVenue } from './domain/recent';
import { VENUE_KINDS, type VenueBands, type VenueKind } from './domain/venueList';

export type ActiveCity = {
  slug: string;
  name: string;
  country: string;
  lat: number;
  lng: number;
  defaultZoom: number;
};

export type CatalogVenue = {
  id: string;
  name: string;
  kind: VenueKind;
  address: string | null;
  googlePlaceId: string;
  cityName: string;
};

const citySchema = z.object({
  slug: z.string(),
  name: z.string(),
  country: z.string(),
  lat: z.number(),
  lng: z.number(),
  default_zoom: z.number(),
});

const venueSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(VENUE_KINDS),
  address: z.string().nullable(),
  google_place_id: z.string(),
  cities: z.object({ name: z.string() }),
});

const bandSchema = z.enum(BANDS);
const bandRowSchema = z.object({
  venue_id: z.string(),
  going_band: bandSchema,
  maybe_band: bandSchema,
  is_sponsored: z.boolean(),
});

async function selectRows(query: PromiseLike<{ data: unknown; error: unknown }>): Promise<unknown> {
  const { data, error } = await query;
  if (error) throw new RpcError(toRpcErrorCode(error));
  return data;
}

// Catalog data only; a RPC because PostgREST would return cities.center as hex EWKB.
export async function fetchActiveCities(): Promise<ActiveCity[]> {
  const data = await callRpc<unknown>('get_active_cities');
  return z
    .array(citySchema)
    .parse(data)
    .map((row) => ({
      slug: row.slug,
      name: row.name,
      country: row.country,
      lat: row.lat,
      lng: row.lng,
      defaultZoom: row.default_zoom,
    }));
}

// Plain select: the venue catalog is readable by every signed-in user (no per-user data).
export async function fetchCityVenues(citySlug: string): Promise<CatalogVenue[]> {
  const data = await selectRows(
    supabase
      .from('venues')
      .select('id, name, kind, address, google_place_id, cities!inner(slug, name)')
      .eq('is_active', true)
      .eq('cities.slug', citySlug),
  );
  return z
    .array(venueSchema)
    .parse(data)
    .map((row) => ({
      id: row.id,
      name: row.name,
      kind: row.kind,
      address: row.address,
      googlePlaceId: row.google_place_id,
      cityName: row.cities.name,
    }));
}

// Turnout bands only (k-anonymity is enforced inside the RPC); no text, so nothing is logged as a search.
export async function fetchVenueBands(citySlug: string): Promise<Map<string, VenueBands>> {
  const data = await callRpc<unknown>('search_venues', { p_city_slug: citySlug });
  const rows = z.array(bandRowSchema).parse(data);
  return new Map(
    rows.map((row) => [
      row.venue_id,
      { goingBand: row.going_band, maybeBand: row.maybe_band, isSponsored: row.is_sponsored },
    ]),
  );
}

// Own rows only (RLS on search_history).
export async function fetchRecentVenues(): Promise<RecentVenue[]> {
  const data = await selectRows(
    supabase
      .from('search_history')
      .select('venue_id, searched_at, venues(name, is_active)')
      .order('searched_at', { ascending: false })
      .limit(MAX_RECENT_VENUES * 2),
  );
  return parseRecentVenues(data);
}

export function rememberVenue(venueId: string): Promise<void> {
  return callRpc('remember_venue', { p_venue_id: venueId });
}
