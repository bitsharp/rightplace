import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildDetailsRequest } from '../_shared/places/details.ts';
import type { VenueKind, VenueRow } from '../_shared/places/types.ts';
import { handleDetail, type VenueRecord } from './handler.ts';

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

async function fetchDetails(placeId: string): Promise<unknown> {
  if (placesKey === '') throw new Error('MISSING_GOOGLE_PLACES_API_KEY');
  const { url, init } = buildDetailsRequest(placeId, placesKey);
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`PLACES_HTTP_${response.status}`);
  return response.json();
}

async function saveRow(citySlug: string, row: VenueRow): Promise<void> {
  const { error } = await admin.rpc('sync_places_venues', { p_city_slug: citySlug, p_rows: [row] });
  if (error) throw new Error('UPSERT_FAILED');
}

Deno.serve((request) =>
  handleDetail(request, { getUserId, getVenue, fetchDetails, saveRow, now: () => new Date() }),
);
