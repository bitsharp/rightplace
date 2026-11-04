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
    ...overrides,
  };
  return { deps, saved, googleCalls: () => googleCalls };
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
