import { assertEquals } from 'jsr:@std/assert@1';
import { handleSearch, type SearchHandlerDeps } from './handler.ts';

const SESSION = '3f1c8a52-7d0e-4a56-9b1f-2c6d8e4a1b90';
const body = { input: 'via torino 20', sessionToken: SESSION, citySlug: 'milano', language: 'it' };

function makeDeps(overrides: Partial<SearchHandlerDeps> = {}) {
  const calls = { consume: [] as string[], google: [] as unknown[], logs: 0 };
  const deps: SearchHandlerDeps = {
    hasPlacesKey: () => true,
    getUserId: () => Promise.resolve('user-1'),
    getCity: () =>
      Promise.resolve({
        center: { lat: 45.4642, lng: 9.19 },
        radiusM: 8000,
        country: 'IT',
        isActive: true,
      }),
    consumeSession: (userId, sessionToken) => {
      calls.consume.push(`${userId}:${sessionToken}`);
      return Promise.resolve(true);
    },
    fetchAutocomplete: (spec) => {
      calls.google.push(spec);
      return Promise.resolve({
        suggestions: [
          {
            placePrediction: {
              placeId: 'ChIJ1',
              structuredFormat: {
                mainText: { text: 'Via Torino 20' },
                secondaryText: { text: 'Milano' },
              },
              types: ['street_address'],
            },
          },
        ],
      });
    },
    ...overrides,
  };
  return { deps, calls };
}

const request = (payload: unknown) =>
  new Request('http://localhost/places-search', { method: 'POST', body: JSON.stringify(payload) });

Deno.test('401 senza utente', async () => {
  const { deps, calls } = makeDeps({ getUserId: () => Promise.resolve(null) });
  assertEquals((await handleSearch(request({ ...body }), deps)).status, 401);
  assertEquals(calls.google.length, 0);
});

Deno.test('400 con input non valido, senza toccare quota né Google', async () => {
  const { deps, calls } = makeDeps();
  assertEquals((await handleSearch(request({ ...body, input: 'ab' }), deps)).status, 400);
  assertEquals((await handleSearch(request({ ...body, sessionToken: 'x' }), deps)).status, 400);
  assertEquals(calls.consume.length + calls.google.length, 0);
});

Deno.test('chiave mancante: 500 generico, nessuna quota consumata, nessuna chiamata', async () => {
  const { deps, calls } = makeDeps({ hasPlacesKey: () => false });
  const response = await handleSearch(request({ ...body }), deps);
  assertEquals(response.status, 500);
  assertEquals(await response.json(), { error: 'INTERNAL' });
  assertEquals(calls.consume.length + calls.google.length, 0);
});

Deno.test('404 se la città non esiste o non è attiva', async () => {
  const { deps } = makeDeps({ getCity: () => Promise.resolve(null) });
  assertEquals((await handleSearch(request({ ...body }), deps)).status, 404);
  const { deps: inactive } = makeDeps({
    getCity: () =>
      Promise.resolve({
        center: { lat: 0, lng: 0 },
        radiusM: 1000,
        country: 'IT',
        isActive: false,
      }),
  });
  assertEquals((await handleSearch(request({ ...body }), inactive)).status, 404);
});

Deno.test('la quota è decisa dal server su ogni richiesta, col token di sessione', async () => {
  const { deps, calls } = makeDeps();
  await handleSearch(request(body), deps);
  await handleSearch(request({ ...body, input: 'via torino 20 m' }), deps);
  assertEquals(calls.consume, [`user-1:${SESSION}`, `user-1:${SESSION}`]);
  assertEquals(calls.google.length, 2);
});

Deno.test('un client che omette o falsifica sessionStart non evita la quota', async () => {
  const { deps, calls } = makeDeps();
  await handleSearch(request({ ...body, sessionStart: false }), deps);
  assertEquals(calls.consume.length, 1);
});

Deno.test('429 oltre il limite, e Google non viene chiamato', async () => {
  const { deps, calls } = makeDeps({ consumeSession: () => Promise.resolve(false) });
  const response = await handleSearch(request({ ...body }), deps);
  assertEquals(response.status, 429);
  assertEquals(await response.json(), { error: 'RATE_LIMITED' });
  assertEquals(calls.google.length, 0);
});

Deno.test('risponde con le suggestions e passa a Google sessione, lingua e città', async () => {
  const { deps, calls } = makeDeps();
  const response = await handleSearch(request({ ...body, language: 'en' }), deps);
  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    suggestions: [
      {
        placeId: 'ChIJ1',
        primaryText: 'Via Torino 20',
        secondaryText: 'Milano',
        types: ['street_address'],
      },
    ],
  });
  assertEquals(calls.google, [
    {
      request: { input: 'via torino 20', sessionToken: SESSION, language: 'en' },
      city: { center: { lat: 45.4642, lng: 9.19 }, radiusM: 8000, country: 'IT' },
    },
  ]);
});

Deno.test('502 se Google fallisce, senza dettagli', async () => {
  const { deps } = makeDeps({
    fetchAutocomplete: () => Promise.reject(new Error('PLACES_HTTP_500 secret')),
  });
  const response = await handleSearch(request({ ...body }), deps);
  assertEquals(response.status, 502);
  assertEquals(await response.json(), { error: 'SEARCH_FAILED' });
});

Deno.test('non scrive mai il testo cercato nei log', async () => {
  const original = [console.log, console.error, console.warn, console.info];
  const seen: string[] = [];
  const capture = (...args: unknown[]) => void seen.push(args.join(' '));
  console.log = console.error = console.warn = console.info = capture;
  try {
    const { deps } = makeDeps({ fetchAutocomplete: () => Promise.reject(new Error('boom')) });
    await handleSearch(request({ ...body }), deps);
  } finally {
    [console.log, console.error, console.warn, console.info] = original;
  }
  assertEquals(seen.filter((line) => line.includes('via torino')).length, 0);
});
