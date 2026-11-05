import { assertEquals } from 'jsr:@std/assert@1';
import { handleGc, type GcDeps, type QueuedFile } from './handler.ts';

const queue: QueuedFile[] = [
  { id: 1, bucketId: 'chat-photos', objectPath: 'u1/a.jpg' },
  { id: 2, bucketId: 'chat-photos', objectPath: 'u1/b.jpg' },
  { id: 3, bucketId: 'posts', objectPath: 'u2/c.jpg' },
];

function makeDeps(overrides: Partial<GcDeps> = {}) {
  const removed: { bucket: string; paths: string[] }[] = [];
  const completed: number[][] = [];
  const logs: string[] = [];
  const deps: GcDeps = {
    gcKey: 'gc-key',
    claim: () => Promise.resolve(queue),
    remove: (bucket, paths) => {
      removed.push({ bucket, paths });
      return Promise.resolve();
    },
    complete: (ids) => {
      completed.push(ids);
      return Promise.resolve();
    },
    log: (message) => logs.push(message),
    ...overrides,
  };
  return { deps, removed, completed, logs };
}

const request = (headers: Record<string, string>) =>
  new Request('http://localhost/storage-gc', { method: 'POST', headers, body: '{}' });

Deno.test('senza x-gc-key risponde 401 e non svuota nulla', async () => {
  const { deps, removed } = makeDeps();
  assertEquals((await handleGc(request({ Authorization: 'Bearer any-jwt' }), deps)).status, 401);
  assertEquals(removed.length, 0);
});

Deno.test('chiave sbagliata risponde 401', async () => {
  const { deps } = makeDeps();
  assertEquals((await handleGc(request({ 'x-gc-key': 'altra' }), deps)).status, 401);
});

Deno.test('secret non configurato: fail closed anche con header vuoto', async () => {
  const { deps } = makeDeps({ gcKey: '' });
  assertEquals((await handleGc(request({ 'x-gc-key': '' }), deps)).status, 401);
  assertEquals((await handleGc(request({}), deps)).status, 401);
});

Deno.test('raggruppa per bucket e completa tutti gli id rimossi', async () => {
  const { deps, removed, completed } = makeDeps();
  const response = await handleGc(request({ 'x-gc-key': 'gc-key' }), deps);
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { removed: 3, failed: 0 });
  assertEquals(removed, [
    { bucket: 'chat-photos', paths: ['u1/a.jpg', 'u1/b.jpg'] },
    { bucket: 'posts', paths: ['u2/c.jpg'] },
  ]);
  assertEquals(completed, [[1, 2, 3]]);
});

Deno.test('completa solo i file rimossi con successo', async () => {
  const { deps, completed } = makeDeps({
    remove: (bucket) =>
      bucket === 'posts' ? Promise.reject(new Error('boom')) : Promise.resolve(),
  });
  const response = await handleGc(request({ 'x-gc-key': 'gc-key' }), deps);
  assertEquals(await response.json(), { removed: 2, failed: 1 });
  assertEquals(completed, [[1, 2]]);
});

Deno.test('completa anche i path che Storage non restituisce (oggetti già assenti)', async () => {
  // remove() succeeds without error but reports nothing: the objects were already gone
  const { deps, completed } = makeDeps({ remove: () => Promise.resolve() });
  const response = await handleGc(request({ 'x-gc-key': 'gc-key' }), deps);
  assertEquals(await response.json(), { removed: 3, failed: 0 });
  assertEquals(completed, [[1, 2, 3]]);
});

Deno.test('coda vuota: niente complete', async () => {
  const { deps, completed } = makeDeps({ claim: () => Promise.resolve([]) });
  assertEquals(await (await handleGc(request({ 'x-gc-key': 'gc-key' }), deps)).json(), {
    removed: 0,
    failed: 0,
  });
  assertEquals(completed.length, 0);
});

Deno.test('i log non contengono i path dei file', async () => {
  const { deps, logs } = makeDeps();
  await handleGc(request({ 'x-gc-key': 'gc-key' }), deps);
  assertEquals(
    logs.some((line) => line.includes('u1/') || line.includes('.jpg')),
    false,
  );
});
