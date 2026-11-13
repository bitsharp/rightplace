import { z } from 'zod';

import type { Intent } from '@/features/nights/domain/band';
import { callRpc } from '@/lib/callRpc';
import { RpcError } from '@/lib/rpcError';

const declaredSchema = z.object({ venue_id: z.string(), declaration_id: z.string() });

export type SpotDeclaration = { venueId: string; declarationId: string };

type DeclareAtSpotInput = { lat: number; lng: number; name: string; intent: Intent };

// The server rounds the point to ~10 m, validates the name, enforces one spot per night and the city radius.
// The author is stored there and never comes back.
export async function declareAtSpot(input: DeclareAtSpotInput): Promise<SpotDeclaration> {
  const data = await callRpc<unknown>('declare_at_spot', {
    p_lat: input.lat,
    p_lng: input.lng,
    p_name: input.name.trim(),
    p_intent: input.intent,
  });
  const row = z.array(declaredSchema).parse(data)[0];
  if (!row) throw new RpcError('UNKNOWN');
  return { venueId: row.venue_id, declarationId: row.declaration_id };
}

// Moderation (principle 7): the spot's name is user-generated; three distinct reports hide it.
export async function reportSpot(venueId: string): Promise<void> {
  await callRpc<unknown>('report', { p_target_kind: 'spot', p_target_id: venueId, p_reason: null });
}
