import { assertEquals } from 'jsr:@std/assert@1';
import { handleSendPush, type ExpoMessage, type ExpoTicket, type SendPushDeps } from './handler.ts';

const USER = '11111111-1111-4111-8111-111111111111';
const message = (overrides: Record<string, unknown> = {}) => ({
  user_ids: [USER],
  title: 'RightPlace',
  body: 'Nuovo messaggio nella chat di Arena Club',
  data: { url: 'rightplace://night/abc/chat' },
  channel_id: 'chat',
  ...overrides,
});

function makeDeps(overrides: Partial<SendPushDeps> = {}) {
  const batches: ExpoMessage[][] = [];
  const removed: string[] = [];
  const logs: string[] = [];
  const deps: SendPushDeps = {
    pushKey: 'push-key',
    tokensFor: () => Promise.resolve(['ExponentPushToken[aaa]']),
    sendExpo: (batch) => {
      batches.push(batch);
      return Promise.resolve(batch.map((): ExpoTicket => ({ status: 'ok' })));
    },
    removeToken: (token) => {
      removed.push(token);
      return Promise.resolve();
    },
    log: (line) => logs.push(line),
    ...overrides,
  };
  return { deps, batches, removed, logs };
}

const request = (body: unknown, headers: Record<string, string> = { 'x-push-key': 'push-key' }) =>
  new Request('http://localhost/send-push', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

Deno.test('senza x-push-key risponde 401 e non invia nulla', async () => {
  const { deps, batches } = makeDeps();
  const response = await handleSendPush(
    request({ messages: [message()] }, { Authorization: 'Bearer any-jwt' }),
    deps,
  );
  assertEquals(response.status, 401);
  assertEquals(batches.length, 0);
});

Deno.test('chiave sbagliata o secret non configurato: 401 (fail closed)', async () => {
  assertEquals(
    (
      await handleSendPush(
        request({ messages: [message()] }, { 'x-push-key': 'altra' }),
        makeDeps().deps,
      )
    ).status,
    401,
  );
  const unset = makeDeps({ pushKey: '' }).deps;
  assertEquals(
    (await handleSendPush(request({ messages: [message()] }, { 'x-push-key': '' }), unset)).status,
    401,
  );
});

Deno.test('un utente con un token: un solo messaggio Expo con i soli campi previsti', async () => {
  const { deps, batches } = makeDeps();
  const response = await handleSendPush(request({ messages: [message()] }), deps);
  assertEquals(response.status, 200);
  assertEquals(await response.json(), { sent: 1, failed: 0, removed: 0 });
  assertEquals(batches, [
    [
      {
        to: 'ExponentPushToken[aaa]',
        title: 'RightPlace',
        body: 'Nuovo messaggio nella chat di Arena Club',
        data: { url: 'rightplace://night/abc/chat' },
        sound: 'default',
        channelId: 'chat',
      },
    ],
  ]);
});

Deno.test('250 token: tre chiamate a Expo da 100, 100 e 50', async () => {
  const tokens = Array.from({ length: 250 }, (_, i) => `ExponentPushToken[t${i}]`);
  const { deps, batches } = makeDeps({ tokensFor: () => Promise.resolve(tokens) });
  const response = await handleSendPush(request({ messages: [message()] }), deps);
  assertEquals(
    batches.map((b) => b.length),
    [100, 100, 50],
  );
  assertEquals((await response.json()).sent, 250);
});

Deno.test('DeviceNotRegistered cancella proprio quel token', async () => {
  const { deps, removed } = makeDeps({
    tokensFor: () => Promise.resolve(['ExponentPushToken[ok]', 'ExponentPushToken[morto]']),
    sendExpo: () =>
      Promise.resolve([
        { status: 'ok' },
        { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
      ]),
  });
  const response = await handleSendPush(request({ messages: [message()] }), deps);
  assertEquals(removed, ['ExponentPushToken[morto]']);
  assertEquals(await response.json(), { sent: 1, failed: 1, removed: 1 });
});

Deno.test('altri errori dei ticket contano come falliti ma non cancellano il token', async () => {
  const { deps, removed } = makeDeps({
    sendExpo: () =>
      Promise.resolve([
        { status: 'error', message: 'x', details: { error: 'MessageRateExceeded' } },
      ]),
  });
  const response = await handleSendPush(request({ messages: [message()] }), deps);
  assertEquals(removed, []);
  assertEquals(await response.json(), { sent: 0, failed: 1, removed: 0 });
});

Deno.test('se Expo non risponde il batch è fallito e gli altri proseguono', async () => {
  let calls = 0;
  const { deps } = makeDeps({
    tokensFor: () =>
      Promise.resolve(Array.from({ length: 150 }, (_, i) => `ExponentPushToken[t${i}]`)),
    sendExpo: (batch) => {
      calls += 1;
      if (calls === 1) return Promise.reject(new Error('rete'));
      return Promise.resolve(batch.map((): ExpoTicket => ({ status: 'ok' })));
    },
  });
  assertEquals(await (await handleSendPush(request({ messages: [message()] }), deps)).json(), {
    sent: 50,
    failed: 100,
    removed: 0,
  });
});

Deno.test('url che non iniziano con rightplace:// sono rifiutati', async () => {
  const { deps, batches } = makeDeps();
  const response = await handleSendPush(
    request({ messages: [message({ data: { url: 'https://evil.example' } })] }),
    deps,
  );
  assertEquals(response.status, 400);
  assertEquals(batches.length, 0);
});

Deno.test(
  'body non valido: canale sconosciuto, testo troppo lungo, uuid errati, troppi utenti',
  async () => {
    const invalid = [
      message({ channel_id: 'altro' }),
      message({ body: 'x'.repeat(201) }),
      message({ user_ids: ['non-un-uuid'] }),
      message({ user_ids: [] }),
      message({ user_ids: Array.from({ length: 1001 }, () => USER) }),
      message({ title: '' }),
    ];
    for (const bad of invalid) {
      const { deps } = makeDeps();
      assertEquals((await handleSendPush(request({ messages: [bad] }), deps)).status, 400);
    }
    assertEquals((await handleSendPush(request({ messages: [] }), makeDeps().deps)).status, 400);
    assertEquals((await handleSendPush(request({}), makeDeps().deps)).status, 400);
  },
);

Deno.test('i campi extra del body non arrivano mai a Expo', async () => {
  const { deps, batches } = makeDeps();
  await handleSendPush(
    request({
      messages: [message({ data: { url: 'rightplace://feed', text: 'segreto' }, extra: 1 })],
    }),
    deps,
  );
  assertEquals(Object.keys(batches[0][0].data), ['url']);
  assertEquals(Object.keys(batches[0][0]).sort(), [
    'body',
    'channelId',
    'data',
    'sound',
    'title',
    'to',
  ]);
});

Deno.test('i log non contengono token, testi né user id', async () => {
  const { deps, logs } = makeDeps({
    tokensFor: () => Promise.resolve(['ExponentPushToken[segretissimo]']),
    sendExpo: () =>
      Promise.resolve([
        { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
      ]),
  });
  await handleSendPush(request({ messages: [message()] }), deps);
  const all = logs.join('\n');
  assertEquals(all.includes('segretissimo') || all.includes('Arena') || all.includes(USER), false);
});

Deno.test('metodo diverso da POST: 405', async () => {
  const { deps } = makeDeps();
  const response = await handleSendPush(
    new Request('http://localhost/send-push', {
      method: 'GET',
      headers: { 'x-push-key': 'push-key' },
    }),
    deps,
  );
  assertEquals(response.status, 405);
});
