import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import { planSync, syncCity } from './sync.ts';
import type { SyncCity, UpsertCounts, VenueRow } from './types.ts';

const city: SyncCity = {
  slug: 'las-palmas',
  name: 'Las Palmas',
  country: 'ES',
  center: { lat: 28.12, lng: -15.41 },
  radiusM: 6000,
  areas: ['Vegueta', 'Triana', 'Las Canteras', 'Santa Catalina', 'Mesa y López', 'Guanarteme'],
};

const googlePlace = (id: string) => ({
  id,
  displayName: { text: `Nome ${id}` },
  location: { latitude: 45, longitude: 9 },
  primaryType: 'bar',
});

function fakeFetch(places: Record<string, unknown[]> = {}) {
  const calls: {
    url: string;
    body: { textQuery: string; languageCode: string; locationBias: unknown };
  }[] = [];
  const fetchFn = (input: string, init?: RequestInit): Promise<Response> => {
    const body = JSON.parse(String(init?.body));
    calls.push({ url: input, body });
    return Promise.resolve(
      new Response(JSON.stringify({ places: places[body.textQuery] ?? [] }), { status: 200 }),
    );
  };
  return { fetchFn, calls };
}

const counts: UpsertCounts = { inserted: 0, updated: 0, demoDeactivated: 0 };

Deno.test(
  'syncCity esegue una chiamata per query pianificata e usa centro, raggio e lingua della città',
  async () => {
    const { fetchFn, calls } = fakeFetch();
    const result = await syncCity(
      { fetch: fetchFn, apiKey: 'k', upsert: () => Promise.resolve(counts) },
      city,
      10,
    );
    assertEquals(calls.length, 10);
    assertEquals(result.calls, 10);
    assertEquals(calls[0]?.body.languageCode, 'es');
    assertEquals(JSON.stringify(calls[0]?.body.locationBias).includes('6000'), true);
  },
);

Deno.test('syncCity non supera mai max_requests', async () => {
  for (const max of [1, 3, 4, 7, 20]) {
    const { fetchFn, calls } = fakeFetch();
    const result = await syncCity(
      { fetch: fetchFn, apiKey: 'k', upsert: () => Promise.resolve(counts) },
      city,
      max,
    );
    assertEquals(calls.length <= max, true, `max ${max}`);
    assertEquals(result.calls, calls.length);
  }
});

Deno.test('syncCity unisce e deduplica le righe, e riporta i conteggi di upsert', async () => {
  const { fetchFn } = fakeFetch({
    'discoteca Las Palmas': [googlePlace('a'), googlePlace('b')],
    'bar de copas Las Palmas': [googlePlace('b'), googlePlace('c')],
  });
  let upserted: VenueRow[] = [];
  const result = await syncCity(
    {
      fetch: fetchFn,
      apiKey: 'k',
      upsert: (rows) => {
        upserted = rows;
        return Promise.resolve({ inserted: 2, updated: 1, demoDeactivated: 10 });
      },
    },
    city,
    4,
  );
  assertEquals(upserted.map((r) => r.google_place_id).sort(), ['a', 'b', 'c']);
  assertEquals(result, { calls: 4, inserted: 2, updated: 1, demoDeactivated: 10 });
});

Deno.test('planSync (dry run) elenca le query senza chiamare nessuno', () => {
  const plan = planSync(city, 6);
  assertEquals(plan.length, 6);
  assertEquals(plan[0]?.textQuery, 'discoteca Las Palmas');
});

Deno.test('syncCity propaga gli errori HTTP di Google e non scrive nulla', async () => {
  let upsertCalled = false;
  await assertRejects(
    () =>
      syncCity(
        {
          fetch: () => Promise.resolve(new Response('no', { status: 403 })),
          apiKey: 'k',
          upsert: () => {
            upsertCalled = true;
            return Promise.resolve(counts);
          },
        },
        city,
        4,
      ),
    Error,
    'PLACES_HTTP_403',
  );
  assertEquals(upsertCalled, false);
});

Deno.test('syncCity rifiuta un tetto non valido', async () => {
  await assertRejects(
    () =>
      syncCity({ fetch: fetchOnly, apiKey: 'k', upsert: () => Promise.resolve(counts) }, city, 0),
    Error,
    'INVALID_MAX_REQUESTS',
  );
});

const fetchOnly = () => Promise.resolve(new Response('{}'));
