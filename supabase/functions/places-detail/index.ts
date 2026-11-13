import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildDetailsRequest, buildSelectionDetailsRequest } from '../_shared/places/details.ts';
import { requireApiKey } from '../_shared/places/search.ts';
import type { SearchLanguage, SelectionRow, VenueKind, VenueRow } from '../_shared/places/types.ts';
import { type CachedPlace, handleDetail, type VenueRecord } from './handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const placesKey = Deno.env.get('GOOGLE_PLACES_API_KEY') ?? '';

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function getUserId(request: Request): Promise<string | null> {
  const authorization = request.headers.get('Authorization');
  if (!authorization) return null;
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data, error } = await client.auth.getUser();
  return error ? null : (data.user?.id ?? null);
}

async function getVenue(venueId: string): Promise<VenueRecord | null> {
  const { data } = await admin
    .from('venues')
    .select('id, google_place_id, kind, places_synced_at, cities(slug)')
    .eq('id', venueId)
    .eq('is_active', true)
    .maybeSingle();
  const city = Array.isArray(data?.cities) ? data.cities[0] : data?.cities;
  if (!data || !city) return null;
  return {
    id: data.id,
    googlePlaceId: data.google_place_id,
    kind: data.kind as VenueKind,
    citySlug: city.slug,
    placesSyncedAt: data.places_synced_at ? new Date(data.places_synced_at) : null,
  };
}

async function callPlaces({ url, init }: { url: string; init: RequestInit }): Promise<unknown> {
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`PLACES_HTTP_${response.status}`);
  return response.json();
}

function fetchDetails(placeId: string): Promise<unknown> {
  return callPlaces(buildDetailsRequest(placeId, requireApiKey(placesKey)));
}

function fetchSelection(
  placeId: string,
  sessionToken: string,
  language: SearchLanguage,
): Promise<unknown> {
  return callPlaces(
    buildSelectionDetailsRequest(placeId, requireApiKey(placesKey), sessionToken, language),
  );
}

async function getCachedPlace(placeId: string): Promise<CachedPlace | null> {
  const { data } = await admin
    .from('venues')
    .select('id, places_synced_at')
    .eq('google_place_id', placeId)
    .eq('is_active', true)
    .maybeSingle();
  if (!data) return null;
  return {
    venueId: data.id,
    placesSyncedAt: data.places_synced_at ? new Date(data.places_synced_at) : null,
  };
}

async function saveSelection(citySlug: string, row: SelectionRow): Promise<string> {
  const { data, error } = await admin.rpc('upsert_search_place', {
    p_city_slug: citySlug,
    p_row: row,
  });
  if (error?.message === 'OUT_OF_CITY') throw new Error('OUT_OF_CITY');
  if (error || typeof data !== 'string') throw new Error('UPSERT_FAILED');
  return data;
}

async function saveRow(citySlug: string, row: VenueRow): Promise<void> {
  const { error } = await admin.rpc('sync_places_venues', { p_city_slug: citySlug, p_rows: [row] });
  if (error) throw new Error('UPSERT_FAILED');
}

Deno.serve((request) =>
  handleDetail(request, {
    getUserId,
    getVenue,
    fetchDetails,
    saveRow,
    getCachedPlace,
    fetchSelection,
    saveSelection,
    now: () => new Date(),
  }),
);
