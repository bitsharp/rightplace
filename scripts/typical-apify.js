#!/usr/bin/env node
// Usage: npm run typical:apify -- --city milano [--dry-run] [--limit 200]
// Fills the "di solito" layer (CLAUDE.md principle 11, roadmap 21) from Google Popular times scraped by an
// Apify actor, accepted risk. Only weekday/hour/level reach the database; live crowd data, names, reviews
// and the token are never stored or logged. Disabled unless TYPICAL_APIFY_ENABLED=true.
const { readApifyEnv, readServiceEnv } = require('./lib/serviceEnv');
const { buildActorInput, extractPlaces } = require('./lib/apifyInput');
const { histogramToRows, toPhotoRow } = require('./lib/apifyTypical');

const CITY_SLUG = /^[a-z0-9-]+$/;
const DEFAULT_LIMIT = 200;
const BATCH_SIZE = 50;
const MAX_ATTEMPTS = 3;
const REQUEST_TIMEOUT_MS = 290_000; // Apify sync runs end after 300 s
// Rough cost of the compass actor per place with minimal options. VERIFY on the actor's pricing page.
const ESTIMATED_USD_PER_PLACE = 0.004;

function parseApifyArgs(argv) {
  const options = { city: undefined, dryRun: false, limit: DEFAULT_LIMIT };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--city') options.city = argv[++i];
    else if (argv[i] === '--dry-run') options.dryRun = true;
    else if (argv[i] === '--limit') options.limit = Number(argv[++i]);
    else throw new Error(`Argomento non riconosciuto: ${argv[i]}`);
  }
  if (options.city === undefined)
    throw new Error('Manca --city, es. `npm run typical:apify -- --city milano`');
  if (!CITY_SLUG.test(options.city)) throw new Error(`Slug di città non valido: ${options.city}`);
  if (!Number.isInteger(options.limit) || options.limit < 1)
    throw new Error('--limit deve essere un intero >= 1');
  return options;
}

const isEnabled = (env) => (env.TYPICAL_APIFY_ENABLED ?? '').trim().toLowerCase() === 'true';
// Separate, default-off switch for the cover photo (one `imageUrl` per venue, accepted risk).
const isPhotosEnabled = (env) =>
  (env.VENUE_PHOTOS_APIFY_ENABLED ?? '').trim().toLowerCase() === 'true';

function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

// Demo and user spots have no real Google place: never sent to Apify.
function filterPlaceIds(ids) {
  return ids.filter(
    (id) =>
      typeof id === 'string' && id !== '' && !id.startsWith('demo-') && !id.startsWith('spot:'),
  );
}

function summarize(requested, rows, photos) {
  const levels = { 0: 0, 1: 0, 2: 0, 3: 0 };
  for (const row of rows) levels[row.level] += 1;
  const withData = new Set(rows.map((row) => row.google_place_id)).size;
  return {
    requested,
    ...(photos === undefined ? {} : { photos }),
    withData,
    withoutData: requested - withData,
    rows: rows.length,
    levels,
    estimatedCostUsd: Number((requested * ESTIMATED_USD_PER_PLACE).toFixed(2)),
  };
}

const serviceHeaders = (key) => ({
  apikey: key,
  Authorization: `Bearer ${key}`,
  'Content-Type': 'application/json',
});

async function fetchPlaceIds(fetchFn, city, limit, { url, serviceRoleKey }) {
  const query = `select=google_place_id,cities!inner(slug)&cities.slug=eq.${city}&is_active=eq.true&kind=neq.spot&order=google_place_id&limit=${limit}`;
  const response = await fetchFn(`${url}/rest/v1/venues?${query}`, {
    headers: serviceHeaders(serviceRoleKey),
  });
  if (!response.ok) throw new Error(`Lettura dei locali rifiutata (${response.status}).`);
  const venues = await response.json();
  return filterPlaceIds(venues.map((venue) => venue.google_place_id)).slice(0, limit);
}

const isRetryable = (status) => status === 429 || status >= 500;

// Error messages carry only the HTTP status: bodies may echo the token or actor data.
async function callApify(fetchFn, sleep, { token, actorId }, placeIds) {
  const url = `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items`;
  const init = {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(buildActorInput(placeIds)),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  };
  for (let attempt = 1; ; attempt += 1) {
    const response = await fetchFn(url, init).catch(() => null);
    if (response?.ok) return response.json();
    const status = response?.status ?? 'rete';
    if (attempt >= MAX_ATTEMPTS || (response && !isRetryable(status))) {
      throw new Error(
        `Apify ha risposto con errore (${status}); nessuna riga scritta per questo lotto.`,
      );
    }
    await sleep(1000 * 2 ** (attempt - 1));
  }
}

// Only places we asked for count; rows carry weekday/hour/level, photos only {place id, image URL}.
function parseItems(items, requestedIds, withPhotos) {
  const places = extractPlaces(items);
  if (places === null)
    throw new Error('Output di Apify inatteso (non è una lista): lotto scartato.');
  const asked = new Set(requestedIds);
  const askedPlaces = places.filter((place) => asked.has(place.placeId));
  return {
    rows: askedPlaces.flatMap((place) => histogramToRows(place.placeId, place.popularTimes)),
    photos: withPhotos
      ? askedPlaces.map((place) => toPhotoRow(place.placeId, place.imageUrl)).filter(Boolean)
      : [],
  };
}

async function importRows(fetchFn, serviceEnv, city, rows, rpcName = 'import_typical_apify') {
  const response = await fetchFn(`${serviceEnv.url}/rest/v1/rpc/${rpcName}`, {
    method: 'POST',
    headers: serviceHeaders(serviceEnv.serviceRoleKey),
    body: JSON.stringify({ p_city_slug: city, p_rows: rows }),
  });
  if (response.ok) return;
  const body = await response.json().catch(() => ({}));
  throw new Error(`Import rifiutato (${body.message ?? response.status}).`);
}

function describeSummary(summary, dryRun) {
  const { levels } = summary;
  return [
    `${dryRun ? '[dry-run] ' : ''}Place con Popular times: ${summary.withData}/${summary.requested} (senza dati: ${summary.withoutData})`,
    `Righe orarie: ${summary.rows} (livello 0: ${levels[0]}, 1: ${levels[1]}, 2: ${levels[2]}, 3: ${levels[3]})`,
    ...(summary.photos === undefined
      ? []
      : [`${dryRun ? '[dry-run] ' : ''}Foto di copertina: ${summary.photos}/${summary.requested}`]),
    `Costo stimato: ~$${summary.estimatedCostUsd} (${ESTIMATED_USD_PER_PLACE} $/place, da verificare sul prezzo dell'attore)`,
  ];
}

const realSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run({ argv, env, fetchFn = fetch, sleep = realSleep, log = console.log }) {
  if (!isEnabled(env)) {
    log('Strato Apify disabilitato (TYPICAL_APIFY_ENABLED != true): niente da fare.');
    return { skipped: true };
  }
  const { city, dryRun, limit } = parseApifyArgs(argv);
  const apifyEnv = readApifyEnv(env);
  const serviceEnv = readServiceEnv(env);

  const withPhotos = isPhotosEnabled(env);
  const placeIds = await fetchPlaceIds(fetchFn, city, limit, serviceEnv);
  const rows = [];
  const photos = [];
  for (const batch of chunk(placeIds, BATCH_SIZE)) {
    const parsed = parseItems(await callApify(fetchFn, sleep, apifyEnv, batch), batch, withPhotos);
    if (!dryRun && parsed.rows.length > 0) await importRows(fetchFn, serviceEnv, city, parsed.rows);
    if (!dryRun && parsed.photos.length > 0)
      await importRows(fetchFn, serviceEnv, city, parsed.photos, 'import_venue_photos_apify');
    rows.push(...parsed.rows);
    photos.push(...parsed.photos);
  }
  const summary = summarize(placeIds.length, rows, withPhotos ? photos.length : undefined);
  describeSummary(summary, dryRun).forEach((line) => log(line));
  return { summary };
}

if (require.main === module) {
  run({ argv: process.argv.slice(2), env: process.env }).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  chunk,
  filterPlaceIds,
  isEnabled,
  isPhotosEnabled,
  parseApifyArgs,
  readApifyEnv,
  run,
  summarize,
};
