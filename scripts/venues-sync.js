#!/usr/bin/env node
// Usage: npm run venues:sync -- --city milano [--city las-palmas] [--dry-run] [--max-requests 10]
// Calls the places-sync Edge Function. The Google Places key stays on Supabase (secret
// GOOGLE_PLACES_API_KEY). This script never uses the service_role key.
const { readSyncEnv } = require('./lib/serviceEnv');

const CITY_SLUG = /^[a-z0-9-]+$/;
const DEFAULT_MAX_REQUESTS = 10;
const HARD_MAX_REQUESTS = 20;

function readMaxRequests(value) {
  const number = /^\d+$/.test(value ?? '') ? Number(value) : Number.NaN;
  if (!(number >= 1 && number <= HARD_MAX_REQUESTS)) {
    throw new Error(`--max-requests deve essere un intero tra 1 e ${HARD_MAX_REQUESTS}`);
  }
  return number;
}

function readCity(value) {
  if (!value || value.startsWith('--')) throw new Error('Manca il valore di --city');
  if (!CITY_SLUG.test(value)) throw new Error(`Slug di città non valido: ${value}`);
  return value;
}

function parseSyncArgs(argv) {
  const options = { cities: [], dryRun: false, maxRequests: DEFAULT_MAX_REQUESTS };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--city') options.cities.push(readCity(argv[++i]));
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--max-requests') options.maxRequests = readMaxRequests(argv[++i]);
    else throw new Error(`Argomento non riconosciuto: ${arg}`);
  }
  if (options.cities.length === 0) {
    throw new Error('Indica almeno una città, es. `npm run venues:sync -- --city milano`');
  }
  return options;
}

function buildSyncRequest(env, { citySlug, dryRun, maxRequests }) {
  const { url, syncAdminKey, anonKey } = readSyncEnv(env);
  return {
    url: `${url}/functions/v1/places-sync`,
    init: {
      method: 'POST',
      headers: {
        // x-sync-key: the function authorizes ONLY with x-sync-key (secret SYNC_ADMIN_KEY).
        'x-sync-key': syncAdminKey,
        // Authorization + apikey: any JWT signed by the project passes the gateway (verify_jwt); the
        // legacy anon key is the least privileged one. A sb_publishable_… key is not a JWT and would fail.
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ city_slug: citySlug, max_requests: maxRequests, dry_run: dryRun }),
    },
  };
}

function formatCityLine(result) {
  if (result.error) return `${result.city}: errore ${result.error}`;
  if (result.dry_run) {
    return `${result.city} (dry run): ${result.estimated_calls} chiamate Places stimate, nessuna eseguita`;
  }
  return `${result.city}: ${result.calls} chiamate Places, ${result.inserted} inseriti, ${result.updated} aggiornati, ${result.demo_deactivated} demo disattivati`;
}

function formatSyncSummary(results) {
  const dryRun = results.some((result) => result.dry_run);
  const total = results.reduce(
    (sum, result) => sum + (result.dry_run ? result.estimated_calls : (result.calls ?? 0)),
    0,
  );
  return [
    ...results.map(formatCityLine),
    `Totale: ${total} chiamate Places${dryRun ? ' stimate' : ''}`,
  ];
}

async function syncOne(env, options, citySlug) {
  const { url, init } = buildSyncRequest(env, { ...options, citySlug });
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  return response.ok ? body : { city: citySlug, error: body.error ?? `HTTP ${response.status}` };
}

async function main() {
  const options = parseSyncArgs(process.argv.slice(2));
  const results = [];
  for (const citySlug of options.cities)
    results.push(await syncOne(process.env, options, citySlug));
  console.log(formatSyncSummary(results).join('\n'));
  if (results.some((result) => result.error)) process.exitCode = 1;
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { buildSyncRequest, formatSyncSummary, parseSyncArgs };
