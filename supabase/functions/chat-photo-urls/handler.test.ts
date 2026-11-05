import { assertEquals } from 'jsr:@std/assert@1';
import { handlePhotoUrls, SIGNED_URL_TTL_SECONDS, type PhotoUrlsDeps } from './handler.ts';

const ID_1 = '00000000-0000-4000-8000-000000000001';
const ID_2 = '00000000-0000-4000-8000-000000000002';

function makeDeps(overrides: Partial<PhotoUrlsDeps> = {}) {
  const asked: { authorization: string; ids: string[] }[] = [];
  const signed: { paths: string[]; ttl: number }[] = [];
  const deps: PhotoUrlsDeps = {
    // the database decides what the caller may see: here only ID_1 is visible
    visiblePhotoPaths: (authorization, ids) => {
      asked.push({ authorization, ids });
      return Promise.resolve(
        ids.includes(ID_1) ? [{ messageId: ID_1, photoPath: 'u1/a.jpg' }] : [],
      );
    },
    signPaths: (paths, ttl) => {
      signed.push({ paths, ttl });
      return Promise.resolve(
        paths.map((path) => ({ path, signedUrl: `https://signed.test/${path}` })),
      );
    },
    ...overrides,
  };
  return { deps, asked, signed };
}

const request = (
  body: unknown,
  headers: Record<string, string> = { Authorization: 'Bearer user-jwt' },
) =>
  new Request('http://localhost/chat-photo-urls', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

Deno.test('senza Authorization risponde 401 e non tocca nulla', async () => {
  const { deps, asked, signed } = makeDeps();
  const response = await handlePhotoUrls(request({ messageIds: [ID_1] }, {}), deps);
  assertEquals(response.status, 401);
  assertEquals(asked.length + signed.length, 0);
});

Deno.test("firma solo i path restituiti dal database, con TTL di un'ora", async () => {
  const { deps, asked, signed } = makeDeps();
  const response = await handlePhotoUrls(request({ messageIds: [ID_1, ID_2] }), deps);
  assertEquals(response.status, 200);
  assertEquals(await response.json(), {
    urls: [{ messageId: ID_1, url: 'https://signed.test/u1/a.jpg' }],
  });
  assertEquals(asked[0], { authorization: 'Bearer user-jwt', ids: [ID_1, ID_2] });
  assertEquals(signed, [{ paths: ['u1/a.jpg'], ttl: 3600 }]);
  assertEquals(SIGNED_URL_TTL_SECONDS, 3600);
});

Deno.test('nessun id visibile: risposta vuota senza chiamare Storage', async () => {
  const { deps, signed } = makeDeps();
  const response = await handlePhotoUrls(request({ messageIds: [ID_2] }), deps);
  assertEquals(await response.json(), { urls: [] });
  assertEquals(signed.length, 0);
});

Deno.test('input non valido risponde 400', async () => {
  const { deps } = makeDeps();
  const tooMany = Array.from(
    { length: 101 },
    (_, i) => `00000000-0000-4000-8000-${String(i).padStart(12, '0')}`,
  );
  for (const body of [
    {},
    { messageIds: [] },
    { messageIds: ['non-uuid'] },
    { messageIds: 'x' },
    { messageIds: tooMany },
  ]) {
    assertEquals((await handlePhotoUrls(request(body), deps)).status, 400);
  }
});

Deno.test('metodo diverso da POST risponde 405', async () => {
  const { deps } = makeDeps();
  const get = new Request('http://localhost/chat-photo-urls', {
    headers: { Authorization: 'Bearer x' },
  });
  assertEquals((await handlePhotoUrls(get, deps)).status, 405);
});

Deno.test('un errore del database non diventa un URL: 502 senza dettagli', async () => {
  const { deps } = makeDeps({
    visiblePhotoPaths: () => Promise.reject(new Error('NOT_ROOM_MEMBER secret detail')),
  });
  const response = await handlePhotoUrls(request({ messageIds: [ID_1] }), deps);
  assertEquals(response.status, 502);
  assertEquals(await response.json(), { error: 'PHOTO_URLS_FAILED' });
});
