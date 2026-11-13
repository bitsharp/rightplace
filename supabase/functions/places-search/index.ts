import { createClient } from 'npm:@supabase/supabase-js@2';
import { buildAutocompleteRequest, requireApiKey } from '../_shared/places/search.ts';
import { handleSearch, type SearchCityRecord, type SearchHandlerDeps } from './handler.ts';

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

async function getCity(slug: string): Promise<SearchCityRecord | null> {
  const { data, error } = await admin.rpc('get_city_sync_info', { p_city_slug: slug });
  const row = Array.isArray(data) ? data[0] : null;
  if (error || !row) return null;
  return {
    center: { lat: row.lat, lng: row.lng },
    radiusM: row.radius_m,
    country: row.country,
    isActive: row.is_active,
  };
}

// Fail closed on a database error: refusing the search is cheaper than an unmetered Google call.
async function consumeSession(userId: string, sessionToken: string): Promise<boolean> {
  const { data, error } = await admin.rpc('consume_places_search_session', {
    p_user_id: userId,
    p_session_token: sessionToken,
  });
  return !error && data === true;
}

async function fetchAutocomplete(
  spec: Parameters<SearchHandlerDeps['fetchAutocomplete']>[0],
): Promise<unknown> {
  const { url, init } = buildAutocompleteRequest(spec.request, spec.city, requireApiKey(placesKey));
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`PLACES_HTTP_${response.status}`);
  return response.json();
}

Deno.serve((request) =>
  handleSearch(request, {
    hasPlacesKey: () => placesKey !== '',
    getUserId,
    getCity,
    consumeSession,
    fetchAutocomplete,
  }),
);
