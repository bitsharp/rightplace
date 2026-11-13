import { assertEquals } from 'jsr:@std/assert@1';
import { type DetailHandlerDeps, handleDetail, type VenueRecord } from './handler.ts';

const now = new Date('2026-11-04T12:00:00Z');

const venue = (overrides: Partial<VenueRecord> = {}): VenueRecord => ({
  id: 'v1',
  googlePlaceId: 'ChIJabc',
  kind: 'bar',
  citySlug: 'milano',
  placesSyncedAt: new Date('2026-09-01T00:00:00Z'),
  ...overrides,
});

function makeDeps(overrides: Partial<DetailHandlerDeps> = {}) {
  const saved: { citySlug: string; id: string }[] = [];
  const selectionCalls: { placeId: string; sessionToken: string; language: string }[] = [];
  const selectionSaved: { citySlug: string; id: string }[] = [];
  let googleCalls = 0;
  const deps: DetailHandlerDeps = {
    getUserId: () => Promise.resolve('user-1'),
    getVenue: () => Promise.resolve(venue()),
    fetchDetails: () => {
      googleCalls += 1;
      return Promise.resolve({
        id: 'ChIJabc',
        displayName: { text: 'Nome' },
        location: { latitude: 1, longitude: 2 },
      });
    },
    saveRow: (citySlug, row) => {
      saved.push({ citySlug, id: row.google_place_id });
      return Promise.resolve();
    },
    now: () => now,
    getCachedPlace: () => Promise.resolve(null),
    fetchSelection: (placeId, sessionToken, language) => {
      selectionCalls.push({ placeId, sessionToken, language });
      return Promise.resolve({
        id: placeId,
        displayName: { text: 'Via Torino 20' },
        formattedAddress: 'Via Torino 20, 20123 Milano MI',
        location: { latitude: 45.4642, longitude: 9.19 },
        types: ['street_address'],
      });
    },
    saveSelection: (citySlug, row) => {
      selectionSaved.push({ citySlug, id: row.google_place_id });
      return Promise.resolve('venue-new');
    },
    ...overrides,
  };
  return { deps, saved, googleCalls: () => googleCalls, selectionCalls, selectionSaved };
}

const request = (body: unknown) =>
  new Request('http://localhost/places-detail', { method: 'POST', body: JSON.stringify(body) });

Deno.test('401 senza utente autenticato', async () => {
  const { deps } = makeDeps({ getUserId: () => Promise.resolve(null) });
  assertEquals((await handleDetail(request({ venue_id: 'v1' }), deps)).status, 401);
});

Deno.test('400 senza venue_id', async () => {
  const { deps } = makeDeps();
  assertEquals((await handleDetail(request({}), deps)).status, 400);
});

Deno.test('404 se il locale non esiste', async () => {
  const { deps } = makeDeps({ getVenue: () => Promise.resolve(null) });
  assertEquals((await handleDetail(request({ venue_id: 'x' }), deps)).status, 404);
});

Deno.test('dati recenti: non chiama Google e risponde refreshed=false', async () => {
  const { deps, googleCalls } = makeDeps({
    getVenue: () => Promise.resolve(venue({ placesSyncedAt: new Date('2026-10-30T00:00:00Z') })),
  });
  const response = await handleDetail(request({ venue_id: 'v1' }), deps);
  assertEquals(await response.json(), { refreshed: false });
  assertEquals(googleCalls(), 0);
});

Deno.test('i locali demo non vanno mai su Google', async () => {
  const { deps, googleCalls } = makeDeps({
    getVenue: () => Promise.resolve(venue({ googlePlaceId: 'demo-01', placesSyncedAt: null })),
  });
  const response = await handleDetail(request({ venue_id: 'v1' }), deps);
  assertEquals(await response.json(), { refreshed: false });
  assertEquals(googleCalls(), 0);
});

Deno.test('dati vecchi: chiama Google una volta e salva la riga', async () => {
  const { deps, saved, googleCalls } = makeDeps();
  const response = await handleDetail(request({ venue_id: 'v1' }), deps);
  assertEquals(await response.json(), { refreshed: true });
  assertEquals(googleCalls(), 1);
  assertEquals(saved, [{ citySlug: 'milano', id: 'ChIJabc' }]);
});

Deno.test('502 se Google non risponde, e non salva nulla', async () => {
  const { deps, saved } = makeDeps({
    fetchDetails: () => Promise.reject(new Error('PLACES_HTTP_500')),
  });
  const response = await handleDetail(request({ venue_id: 'v1' }), deps);
  assertEquals(response.status, 502);
  assertEquals(saved.length, 0);
});

const SESSION = '3f1c8a52-7d0e-4a56-9b1f-2c6d8e4a1b90';
const selection = { place_id: 'ChIJaddr', session_token: SESSION, city_slug: 'milano' };

Deno.test('selezione: 401 senza utente e 400 con dati non validi', async () => {
  const { deps } = makeDeps({ getUserId: () => Promise.resolve(null) });
  assertEquals((await handleDetail(request(selection), deps)).status, 401);
  const { deps: ok } = makeDeps();
  assertEquals((await handleDetail(request({ ...selection, session_token: 'x' }), ok)).status, 400);
});

Deno.test('selezione: una Details Pro con la sessione, salva e risponde venue_id', async () => {
  const { deps, selectionCalls, selectionSaved, googleCalls } = makeDeps();
  const response = await handleDetail(request(selection), deps);
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { venue_id: 'venue-new' });
  assertEquals(selectionCalls, [{ placeId: 'ChIJaddr', sessionToken: SESSION, language: 'it' }]);
  assertEquals(selectionSaved, [{ citySlug: 'milano', id: 'ChIJaddr' }]);
  assertEquals(googleCalls(), 0);
});

Deno.test('selezione: già in cache e fresca → nessuna chiamata a Google', async () => {
  const { deps, selectionCalls } = makeDeps({
    getCachedPlace: () =>
      Promise.resolve({
        venueId: 'venue-cached',
        placesSyncedAt: new Date('2026-10-30T00:00:00Z'),
      }),
  });
  const response = await handleDetail(request(selection), deps);
  assertEquals(await response.json(), { venue_id: 'venue-cached' });
  assertEquals(selectionCalls.length, 0);
});

Deno.test('selezione: in cache ma vecchia → richiama Google e aggiorna', async () => {
  const { deps, selectionCalls } = makeDeps({
    getCachedPlace: () =>
      Promise.resolve({ venueId: 'venue-old', placesSyncedAt: new Date('2026-09-01T00:00:00Z') }),
  });
  const response = await handleDetail(request(selection), deps);
  assertEquals(await response.json(), { venue_id: 'venue-new' });
  assertEquals(selectionCalls.length, 1);
});

Deno.test('selezione: punto fuori città → 422 OUT_OF_CITY', async () => {
  const { deps } = makeDeps({ saveSelection: () => Promise.reject(new Error('OUT_OF_CITY')) });
  const response = await handleDetail(request(selection), deps);
  assertEquals(response.status, 422);
  assertEquals(await response.json(), { error: 'OUT_OF_CITY' });
});

Deno.test('selezione: Google o salvataggio falliscono → 502 senza dettagli', async () => {
  const { deps } = makeDeps({
    fetchSelection: () => Promise.reject(new Error('MISSING_GOOGLE_PLACES_API_KEY')),
  });
  const response = await handleDetail(request(selection), deps);
  assertEquals(response.status, 502);
  assertEquals(await response.json(), { error: 'SELECTION_FAILED' });
  const { deps: broken } = makeDeps({
    saveSelection: () => Promise.reject(new Error('UPSERT_FAILED')),
  });
  assertEquals((await handleDetail(request(selection), broken)).status, 502);
});

Deno.test('selezione: luogo senza dati utili → 502', async () => {
  const { deps, selectionSaved } = makeDeps({ fetchSelection: () => Promise.resolve({ id: 'x' }) });
  assertEquals((await handleDetail(request(selection), deps)).status, 502);
  assertEquals(selectionSaved.length, 0);
});

Deno.test('la forma venue_id esistente non cambia', async () => {
  const { deps, selectionCalls } = makeDeps();
  const response = await handleDetail(request({ venue_id: 'v1' }), deps);
  assertEquals(await response.json(), { refreshed: true });
  assertEquals(selectionCalls.length, 0);
});
