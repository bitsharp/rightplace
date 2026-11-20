import { json, safeEqual } from '../_shared/auth.ts';

const CHANNELS = ['promemoria', 'amici', 'chat', 'feed', 'creator', 'supporto'] as const;
type Channel = (typeof CHANNELS)[number];

const EXPO_BATCH_SIZE = 100;
const MAX_MESSAGES = 500;
const MAX_USERS_PER_MESSAGE = 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type PushMessage = {
  userIds: string[];
  title: string;
  body: string;
  url: string;
  channel: Channel;
};

// Only these fields ever reach Expo: no message text, no photo, no user id.
export type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data: { url: string };
  sound: 'default';
  channelId: Channel;
};

export type ExpoTicket = {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
};

export type SendPushDeps = {
  pushKey: string;
  tokensFor: (userIds: string[]) => Promise<string[]>;
  // One batch of at most 100 messages; tickets come back in the same order. Throws when Expo is unreachable.
  sendExpo: (batch: ExpoMessage[]) => Promise<ExpoTicket[]>;
  removeToken: (token: string) => Promise<void>;
  log: (line: string) => void;
};

// Fail closed: an unset SEND_PUSH_KEY or a missing/empty header never authorizes.
function isAuthorized(request: Request, pushKey: string): boolean {
  const provided = request.headers.get('x-push-key');
  if (pushKey === '' || provided === null || provided === '') return false;
  return safeEqual(provided, pushKey);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMessage(raw: unknown): PushMessage | null {
  if (!isRecord(raw) || !isRecord(raw.data)) return null;
  const { user_ids: userIds, title, body, channel_id: channel } = raw;
  const url = raw.data.url;
  if (!Array.isArray(userIds) || userIds.length === 0 || userIds.length > MAX_USERS_PER_MESSAGE)
    return null;
  if (!userIds.every((id) => typeof id === 'string' && UUID.test(id))) return null;
  if (typeof title !== 'string' || title.length === 0 || title.length > 100) return null;
  if (typeof body !== 'string' || body.length === 0 || body.length > 200) return null;
  if (typeof url !== 'string' || !url.startsWith('rightplace://') || url.length > 300) return null;
  if (!CHANNELS.includes(channel as Channel)) return null;
  return { userIds, title, body, url, channel: channel as Channel };
}

function parseBody(raw: unknown): PushMessage[] | null {
  if (!isRecord(raw) || !Array.isArray(raw.messages)) return null;
  if (raw.messages.length === 0 || raw.messages.length > MAX_MESSAGES) return null;
  const messages = raw.messages.map(parseMessage);
  return messages.every((m): m is PushMessage => m !== null) ? messages : null;
}

async function expand(messages: PushMessage[], deps: SendPushDeps): Promise<ExpoMessage[]> {
  const expo: ExpoMessage[] = [];
  for (const message of messages) {
    for (const to of await deps.tokensFor(message.userIds)) {
      expo.push({
        to,
        title: message.title,
        body: message.body,
        data: { url: message.url },
        sound: 'default',
        channelId: message.channel,
      });
    }
  }
  return expo;
}

type Totals = { sent: number; failed: number; removed: number };

async function deliverBatch(batch: ExpoMessage[], deps: SendPushDeps): Promise<Totals> {
  const totals: Totals = { sent: 0, failed: 0, removed: 0 };
  let tickets: ExpoTicket[];
  try {
    tickets = await deps.sendExpo(batch);
  } catch {
    deps.log('send-push batch failed');
    return { ...totals, failed: batch.length };
  }
  for (const [index, message] of batch.entries()) {
    const ticket = tickets[index];
    if (ticket?.status === 'ok') {
      totals.sent += 1;
      continue;
    }
    totals.failed += 1;
    if (ticket?.details?.error !== 'DeviceNotRegistered') continue;
    await deps.removeToken(message.to);
    totals.removed += 1;
  }
  return totals;
}

// Called by pg_cron through pg_net (private.dispatch_notifications), so there is no user JWT:
// the only credential is `x-push-key`. Logs carry counts only: tokens, texts and user ids are never written.
export async function handleSendPush(request: Request, deps: SendPushDeps): Promise<Response> {
  if (!isAuthorized(request, deps.pushKey)) return json({ error: 'UNAUTHORIZED' }, 401);
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const messages = parseBody(await request.json().catch(() => null));
  if (messages === null) return json({ error: 'INVALID_BODY' }, 400);

  try {
    const expo = await expand(messages, deps);
    const totals: Totals = { sent: 0, failed: 0, removed: 0 };
    for (let start = 0; start < expo.length; start += EXPO_BATCH_SIZE) {
      const result = await deliverBatch(expo.slice(start, start + EXPO_BATCH_SIZE), deps);
      totals.sent += result.sent;
      totals.failed += result.failed;
      totals.removed += result.removed;
    }
    deps.log(`send-push sent=${totals.sent} failed=${totals.failed} removed=${totals.removed}`);
    return json(totals);
  } catch {
    deps.log('send-push failed');
    return json({ error: 'SEND_FAILED' }, 502);
  }
}
