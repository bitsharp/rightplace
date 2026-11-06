import { z } from 'zod';

import { BANDS, type Band } from '@/features/nights/domain/band';
import { VENUE_KINDS, type VenueKind } from '@/features/venues/domain/venueList';
import { callRpc } from '@/lib/callRpc';
import { RpcError } from '@/lib/rpcError';

import type { EventInput } from './domain/eventForm';

export type EventScope = 'upcoming' | 'past';

const bandSchema = z.enum(BANDS);
const nullableNumber = z.number().nullable();

const eventRowSchema = z.object({
  event_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  venue_id: z.string(),
  venue_name: z.string(),
  venue_kind: z.enum(VENUE_KINDS),
  starts_at: z.string(),
  ends_at: z.string(),
  cancelled_at: z.string().nullable(),
  going_band: bandSchema,
  maybe_band: bandSchema,
  target_age_bands: z.array(z.string()),
  target_genders: z.array(z.string()),
  is_sponsored: z.boolean(),
  can_edit: z.boolean(),
  timezone: z.string(),
});

// Sign-ups are bands (k ≥ 3), never people: the RPC has no user column to map (principles 1, 2).
export type CreatorEvent = {
  eventId: string;
  name: string;
  description: string | null;
  venueId: string;
  venueName: string;
  venueKind: VenueKind;
  startsAt: string;
  endsAt: string;
  cancelledAt: string | null;
  goingBand: Band;
  maybeBand: Band;
  ageBands: string[];
  genders: string[];
  isSponsored: boolean;
  canEdit: boolean;
  timezone: string;
};

export async function fetchMyEvents(scope: EventScope): Promise<CreatorEvent[]> {
  const rows = z
    .array(eventRowSchema)
    .parse(await callRpc<unknown>('get_my_creator_events', { p_scope: scope }));
  return rows.map((row) => ({
    eventId: row.event_id,
    name: row.name,
    description: row.description,
    venueId: row.venue_id,
    venueName: row.venue_name,
    venueKind: row.venue_kind,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    cancelledAt: row.cancelled_at,
    goingBand: row.going_band,
    maybeBand: row.maybe_band,
    ageBands: row.target_age_bands,
    genders: row.target_genders,
    isSponsored: row.is_sponsored,
    canEdit: row.can_edit,
    timezone: row.timezone,
  }));
}

const attendanceRowSchema = z.object({
  going_band: bandSchema,
  maybe_band: bandSchema,
  avg_age: nullableNumber,
  female_pct: nullableNumber,
  male_pct: nullableNumber,
  other_pct: nullableNumber,
});

export type EventAttendance = {
  goingBand: Band;
  maybeBand: Band;
  avgAge: number | null;
  femalePct: number | null;
  malePct: number | null;
  otherPct: number | null;
};

// Age and gender are null when the server found fewer than 3 people (or a sub-group below 3).
export async function fetchEventAttendance(eventId: string): Promise<EventAttendance> {
  const rows = z
    .array(attendanceRowSchema)
    .parse(await callRpc<unknown>('get_event_attendance', { p_event_id: eventId }));
  const row = rows[0];
  if (!row) throw new RpcError('NOT_FOUND');
  return {
    goingBand: row.going_band,
    maybeBand: row.maybe_band,
    avgAge: row.avg_age,
    femalePct: row.female_pct,
    malePct: row.male_pct,
    otherPct: row.other_pct,
  };
}

const editableFields = (input: EventInput) => ({
  p_name: input.name,
  p_description: input.description,
  p_starts_at: input.startsAt,
  p_ends_at: input.endsAt,
  p_target_age_bands: input.ageBands,
  p_target_genders: input.genders,
});

export async function createEvent(input: EventInput): Promise<string> {
  const id = await callRpc<unknown>('create_event', {
    p_venue_id: input.venueId,
    ...editableFields(input),
  });
  return z.string().parse(id);
}

// The venue never changes after creation: the server ignores nothing, we simply do not send it.
export async function updateEvent(eventId: string, input: EventInput): Promise<void> {
  await callRpc<unknown>('update_event', { p_event_id: eventId, ...editableFields(input) });
}

export async function cancelEvent(eventId: string): Promise<void> {
  await callRpc<unknown>('cancel_event', { p_event_id: eventId });
}
