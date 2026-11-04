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
    syncAdminKey: 'admin-key',
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

const request = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost/places-sync', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
// The Bearer only gets through the Supabase gateway; the handler authorizes with x-sync-key.
const asAdmin = (body: unknown) =>
  request(body, { 'x-sync-key': 'admin-key', Authorization: 'Bearer any-project-jwt' });
const asService = asAdmin;

Deno.test('401 senza x-sync-key', async () => {
  const { deps, calls } = makeDeps();
  assertEquals((await handleSync(request({ city_slug: 'milano' }), deps)).status, 401);
  assertEquals(calls.length, 0);
});

Deno.test('401 con una x-sync-key sbagliata', async () => {
  const { deps } = makeDeps();
  const response = await handleSync(
    request({ city_slug: 'milano' }, { 'x-sync-key': 'sbagliata' }),
    deps,
  );
  assertEquals(response.status, 401);
});

Deno.test(
  'fail closed: SYNC_ADMIN_KEY vuota non autorizza mai, nemmeno con header vuoto',
  async () => {
    const { deps, calls } = makeDeps({ syncAdminKey: '' });
    const emptyHeader = await handleSync(
      request({ city_slug: 'milano' }, { 'x-sync-key': '' }),
      deps,
    );
    assertEquals(emptyHeader.status, 401);
    const filledHeader = await handleSync(
      request({ city_slug: 'milano' }, { 'x-sync-key': 'qualcosa' }),
      deps,
    );
    assertEquals(filledHeader.status, 401);
    const noHeader = await handleSync(request({ city_slug: 'milano' }), deps);
    assertEquals(noHeader.status, 401);
    assertEquals(calls.length, 0);
  },
);

Deno.test('401 se la chiave giusta è solo nel Bearer', async () => {
  const { deps } = makeDeps();
  const response = await handleSync(
    request({ city_slug: 'milano' }, { Authorization: 'Bearer admin-key' }),
    deps,
  );
  assertEquals(response.status, 401);
});

Deno.test('200 con x-sync-key giusta, qualunque sia il Bearer', async () => {
  const { deps } = makeDeps();
  const response = await handleSync(
    request({ city_slug: 'milano' }, { 'x-sync-key': 'admin-key', Authorization: 'Bearer altro' }),
    deps,
  );
  assertEquals(response.status, 200);
});

Deno.test('405 per metodi diversi da POST', async () => {
  const { deps } = makeDeps();
  const response = await handleSync(
    new Request('http://localhost/places-sync', {
      headers: { 'x-sync-key': 'admin-key' },
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
    headers: { 'x-sync-key': 'admin-key' },
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
    assertEquals(logs[0]?.includes('admin-key'), false);
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
