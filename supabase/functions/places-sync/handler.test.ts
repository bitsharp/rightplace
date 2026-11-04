import { assertEquals } from 'jsr:@std/assert@1';
import {
  CityNotActiveError,
  CityNotFoundError,
  handleSync,
  type SyncHandlerDeps,
  type SyncOutcome,
} from './handler.ts';

type Call = { citySlug: string; maxRequests: number; dryRun: boolean };

function makeDeps(overrides: Partial<SyncHandlerDeps> = {}) {
  const logs: string[] = [];
  const calls: Call[] = [];
  const deps: SyncHandlerDeps = {
    serviceRoleKey: 'service-key',
    runSync: (citySlug, options): Promise<SyncOutcome> => {
      calls.push({ citySlug, ...options });
      return Promise.resolve(
        options.dryRun
          ? { dryRun: true, queries: [{ kind: 'club', textQuery: 'discoteca X' }] }
          : { dryRun: false, calls: 7, inserted: 12, updated: 3, demoDeactivated: 10 },
      );
    },
    log: (message) => logs.push(message),
    ...overrides,
  };
  return { deps, logs, calls };
}

const request = (body: unknown, authorization?: string) =>
  new Request('http://localhost/places-sync', {
    method: 'POST',
    headers: authorization ? { Authorization: authorization } : {},
    body: JSON.stringify(body),
  });
const asService = (body: unknown) => request(body, 'Bearer service-key');

Deno.test('401 senza Authorization o con una chiave diversa dalla service role', async () => {
  const { deps } = makeDeps();
  assertEquals((await handleSync(request({ city_slug: 'milano' }), deps)).status, 401);
  assertEquals(
    (await handleSync(request({ city_slug: 'milano' }, 'Bearer jwt-utente'), deps)).status,
    401,
  );
});

Deno.test('405 per metodi diversi da POST', async () => {
  const { deps } = makeDeps();
  const response = await handleSync(
    new Request('http://localhost/places-sync', {
      headers: { Authorization: 'Bearer service-key' },
    }),
    deps,
  );
  assertEquals(response.status, 405);
});

Deno.test('400 senza city_slug o con corpo non valido', async () => {
  const { deps } = makeDeps();
  assertEquals((await handleSync(asService({}), deps)).status, 400);
  const broken = new Request('http://localhost/places-sync', {
    method: 'POST',
    headers: { Authorization: 'Bearer service-key' },
    body: 'non json',
  });
  assertEquals((await handleSync(broken, deps)).status, 400);
});

Deno.test('400 se max_requests o dry_run non sono validi (max 20)', async () => {
  const { deps, calls } = makeDeps();
  for (const bad of [
    { max_requests: 0 },
    { max_requests: 21 },
    { max_requests: 2.5 },
    { max_requests: '5' },
    { dry_run: 'si' },
  ]) {
    const response = await handleSync(asService({ city_slug: 'milano', ...bad }), deps);
    assertEquals(response.status, 400, JSON.stringify(bad));
  }
  assertEquals(calls.length, 0);
});

Deno.test('default: 10 richieste, niente dry run', async () => {
  const { deps, calls } = makeDeps();
  await handleSync(asService({ city_slug: 'milano' }), deps);
  assertEquals(calls, [{ citySlug: 'milano', maxRequests: 10, dryRun: false }]);
});

Deno.test(
  '200 con conteggi e demo_deactivated; il log ha le chiamate e non la chiave',
  async () => {
    const { deps, logs } = makeDeps();
    const response = await handleSync(asService({ city_slug: 'milano', max_requests: 20 }), deps);
    assertEquals(response.status, 200);
    assertEquals(await response.json(), {
      city: 'milano',
      calls: 7,
      inserted: 12,
      updated: 3,
      demo_deactivated: 10,
    });
    assertEquals(logs.length, 1);
    assertEquals(logs[0]?.includes('calls=7'), true);
    assertEquals(logs[0]?.includes('service-key'), false);
  },
);

Deno.test('dry run: restituisce query pianificate e estimated_calls', async () => {
  const { deps, calls } = makeDeps();
  const response = await handleSync(
    asService({ city_slug: 'milano', dry_run: true, max_requests: 5 }),
    deps,
  );
  assertEquals(await response.json(), {
    city: 'milano',
    dry_run: true,
    estimated_calls: 1,
    queries: [{ kind: 'club', textQuery: 'discoteca X' }],
  });
  assertEquals(calls, [{ citySlug: 'milano', maxRequests: 5, dryRun: true }]);
});

Deno.test('404 se la città non esiste; 400 CITY_NOT_ACTIVE se non è attiva', async () => {
  const missing = makeDeps({ runSync: () => Promise.reject(new CityNotFoundError()) });
  assertEquals((await handleSync(asService({ city_slug: 'atlantide' }), missing.deps)).status, 404);
  const inactive = makeDeps({ runSync: () => Promise.reject(new CityNotActiveError()) });
  const response = await handleSync(asService({ city_slug: 'madrid' }), inactive.deps);
  assertEquals(response.status, 400);
  assertEquals(await response.json(), { error: 'CITY_NOT_ACTIVE' });
});

Deno.test('502 se Google o il database falliscono, senza esporre il dettaglio', async () => {
  const { deps, logs } = makeDeps({
    runSync: () => Promise.reject(new Error('PLACES_HTTP_403')),
  });
  const response = await handleSync(asService({ city_slug: 'milano' }), deps);
  assertEquals(response.status, 502);
  assertEquals(await response.json(), { error: 'SYNC_FAILED' });
  assertEquals(logs[0]?.includes('PLACES_HTTP_403'), true);
});
