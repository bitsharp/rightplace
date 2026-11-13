import { createClient } from 'npm:@supabase/supabase-js@2';
import { handleSendPush, type ExpoMessage, type ExpoTicket } from './handler.ts';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// `supabase secrets set SEND_PUSH_KEY=...`; the same value lives in Vault as `send_push_key`.
const pushKey = Deno.env.get('SEND_PUSH_KEY') ?? '';

const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

async function tokensFor(userIds: string[]): Promise<string[]> {
  const { data, error } = await admin.from('push_tokens').select('token').in('user_id', userIds);
  if (error) throw new Error('TOKENS_FAILED');
  return (data ?? []).map((row: { token: string }) => row.token);
}

async function sendExpo(batch: ExpoMessage[]): Promise<ExpoTicket[]> {
  const response = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(batch),
  });
  if (!response.ok) throw new Error('EXPO_UNREACHABLE');
  const payload: { data?: ExpoTicket[] } = await response.json();
  return payload.data ?? [];
}

async function removeToken(token: string): Promise<void> {
  const { error } = await admin.from('push_tokens').delete().eq('token', token);
  if (error) throw new Error('REMOVE_FAILED');
}

Deno.serve((request) =>
  handleSendPush(request, {
    pushKey,
    tokensFor,
    sendExpo,
    removeToken,
    log: (m) => console.log(m),
  }),
);
