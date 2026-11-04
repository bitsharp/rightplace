import { createClient } from 'npm:@supabase/supabase-js@2';
import { planSync, syncCity } from '../_shared/places/sync.ts';
import type { SyncCity, UpsertCounts, VenueRow } from '../_shared/places/types.ts';
import { CityNotActiveError, CityNotFoundError, handleSync, type SyncOptions } from './handler.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// Secret set with `supabase secrets set GOOGLE_PLACES_API_KEY=...`. Not the Maps SDK key.
const placesKey = Deno.env.get('GOOGLE_PLACES_API_KEY') ?? '';

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function loadCity(slug: string): Promise<SyncCity> {
  const { data, error } = await admin.rpc('get_city_sync_info', { p_city_slug: slug });
  if (error?.message === 'NOT_FOUND') throw new CityNotFoundError();
  const info = Array.isArray(data) ? data[0] : null;
  if (error || !info) throw new Error('CITY_LOOKUP_FAILED');
  if (!info.is_active) throw new CityNotActiveError();
  return {
    slug,
    name: info.name,
    country: info.country,
    center: { lat: info.lat, lng: info.lng },
    radiusM: info.radius_m,
    areas: info.areas ?? [],
  };
}

async function upsertRows(slug: string, rows: VenueRow[]): Promise<UpsertCounts> {
  const { data, error } = await admin.rpc('sync_places_venues', {
    p_city_slug: slug,
    p_rows: rows,
  });
  const counts = Array.isArray(data) ? data[0] : null;
  if (error || !counts) throw new Error('UPSERT_FAILED');
  return {
    inserted: counts.inserted,
    updated: counts.updated,
    demoDeactivated: counts.demo_deactivated,
  };
}

async function runSync(slug: string, options: SyncOptions) {
  const city = await loadCity(slug);
  if (options.dryRun)
    return { dryRun: true as const, queries: planSync(city, options.maxRequests) };
  if (placesKey === '') throw new Error('MISSING_GOOGLE_PLACES_API_KEY');
  const deps = {
    fetch: (url: string, init?: RequestInit) => fetch(url, init),
    apiKey: placesKey,
    upsert: (rows: VenueRow[]) => upsertRows(slug, rows),
  };
  return { dryRun: false as const, ...(await syncCity(deps, city, options.maxRequests)) };
}

Deno.serve((request) =>
  handleSync(request, { serviceRoleKey, runSync, log: (message) => console.log(message) }),
);
