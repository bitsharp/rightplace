import { z } from 'zod';

import { BANDS, type Band } from '@/features/nights/domain/band';
import type { VenueFriend } from '@/features/venue/api';
import { VENUE_KINDS, type VenueKind } from '@/features/venues/domain/venueList';
import { callRpc } from '@/lib/callRpc';
import { RpcError } from '@/lib/rpcError';

const bandSchema = z.enum(BANDS);
const kindSchema = z.enum(VENUE_KINDS);
const nullableNumber = z.number().nullable();

const cityRowSchema = z.object({
  event_id: z.string(),
  name: z.string(),
  venue_id: z.string(),
  venue_name: z.string(),
  venue_kind: kindSchema,
  lat: z.number(),
  lng: z.number(),
  starts_at: z.string(),
  ends_at: z.string(),
  going_band: bandSchema,
  maybe_band: bandSchema,
  is_sponsored: z.boolean(),
  timezone: z.string(),
});

export type CityEvent = {
  eventId: string;
  name: string;
  venueId: string;
  venueName: string;
  venueKind: VenueKind;
  lat: number;
  lng: number;
  startsAt: string;
  endsAt: string;
  goingBand: Band;
  maybeBand: Band;
  isSponsored: boolean;
  timezone: string;
};

// Upcoming events of a city with turnout bands only (k-anonymity lives in get_city_events).
export async function fetchCityEvents(
  citySlug: string,
  query = '',
  days?: number,
): Promise<CityEvent[]> {
  const text = query.trim();
  const data = await callRpc<unknown>('get_city_events', {
    p_city_slug: citySlug,
    p_query: text === '' ? null : text,
    ...(days === undefined ? {} : { p_days: days }),
  });
  return z
    .array(cityRowSchema)
    .parse(data)
    .map((row) => ({
      eventId: row.event_id,
      name: row.name,
      venueId: row.venue_id,
      venueName: row.venue_name,
      venueKind: row.venue_kind,
      lat: row.lat,
      lng: row.lng,
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      goingBand: row.going_band,
      maybeBand: row.maybe_band,
      isSponsored: row.is_sponsored,
      timezone: row.timezone,
    }));
}

const friendSchema = z.object({
  handle: z.string(),
  age_band: z.enum(['18-24', '25-34', '35-44', '45+']),
  gender: z.enum(['female', 'male', 'other']),
  intent: z.enum(['going', 'maybe']),
});

const detailRowSchema = z.object({
  event_id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  starts_at: z.string(),
  ends_at: z.string(),
  cancelled_at: z.string().nullable(),
  target_age_bands: z.array(z.string()),
  target_genders: z.array(z.string()),
  venue_id: z.string(),
  venue_name: z.string(),
  venue_kind: kindSchema,
  timezone: z.string(),
  going_band: bandSchema,
  maybe_band: bandSchema,
  avg_age: nullableNumber,
  female_pct: nullableNumber,
  male_pct: nullableNumber,
  other_pct: nullableNumber,
  friends: z.array(friendSchema),
  is_mine: z.boolean(),
  creator_handle: z.string(),
});

export type EventDetail = {
  eventId: string;
  name: string;
  description: string | null;
  startsAt: string;
  endsAt: string;
  cancelledAt: string | null;
  ageBands: string[];
  genders: string[];
  venueId: string;
  venueName: string;
  venueKind: VenueKind;
  timezone: string;
  goingBand: Band;
  maybeBand: Band;
  avgAge: number | null;
  femalePct: number | null;
  malePct: number | null;
  friends: VenueFriend[];
  isMine: boolean;
  creatorHandle: string;
};

// Same privacy shape as get_venue_stats: bands always, statistics only with k ≥ 3, friends = accepted follows.
export async function fetchEventDetail(eventId: string): Promise<EventDetail> {
  const rows = z
    .array(detailRowSchema)
    .parse(await callRpc<unknown>('get_event_detail', { p_event_id: eventId }));
  const row = rows[0];
  if (!row) throw new RpcError('NOT_FOUND');
  return {
    eventId: row.event_id,
    name: row.name,
    description: row.description,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    cancelledAt: row.cancelled_at,
    ageBands: row.target_age_bands,
    genders: row.target_genders,
    venueId: row.venue_id,
    venueName: row.venue_name,
    venueKind: row.venue_kind,
    timezone: row.timezone,
    goingBand: row.going_band,
    maybeBand: row.maybe_band,
    avgAge: row.avg_age,
    femalePct: row.female_pct,
    malePct: row.male_pct,
    friends: row.friends.map((friend) => ({
      handle: friend.handle,
      ageBand: friend.age_band,
      gender: friend.gender,
      intent: friend.intent,
    })),
    isMine: row.is_mine,
    creatorHandle: row.creator_handle,
  };
}
