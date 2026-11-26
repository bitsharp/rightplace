import { z } from 'zod';

import { BANDS, type Band, type Intent } from '@/features/nights/domain/band';
import { VENUE_KINDS, type VenueKind } from '@/features/venues/domain/venueList';
import { callRpc } from '@/lib/callRpc';
import { supabase } from '@/lib/supabase';
import { RpcError } from '@/lib/rpcError';

import type { DeclarationTarget } from './domain/declarationState';
import type { StatsSegment } from './domain/statsState';

const detailRowSchema = z.object({
  venue_id: z.string(),
  name: z.string(),
  kind: z.enum(VENUE_KINDS),
  address: z.string().nullable(),
  opening_hours: z.unknown(),
  google_place_id: z.string(),
  lat: z.number(),
  lng: z.number(),
  city_slug: z.string(),
  city_name: z.string(),
  country: z.string(),
  timezone: z.string(),
  taxi_number: z.string().nullable(),
  // Cover photo URL: null when absent, stale or switched off server-side; tolerated missing on an older RPC.
  photo_url: z.string().nullish(),
  website_uri: z.string().nullish(),
});

export type VenueDetail = {
  venueId: string;
  name: string;
  kind: VenueKind;
  address: string | null;
  openingHours: unknown;
  googlePlaceId: string;
  lat: number;
  lng: number;
  citySlug: string;
  cityName: string;
  country: string;
  timezone: string;
  taxiNumber: string | null;
  photoUrl: string | null;
  websiteUri: string | null;
};

// Catalog data only (no per-user fields): the RPC exists because PostgREST returns `location` as EWKB.
export async function fetchVenueDetail(venueId: string): Promise<VenueDetail> {
  const rows = z
    .array(detailRowSchema)
    .parse(await callRpc<unknown>('get_venue_detail', { p_venue_id: venueId }));
  const row = rows[0];
  if (!row) throw new RpcError('NOT_FOUND');
  return {
    venueId: row.venue_id,
    name: row.name,
    kind: row.kind,
    address: row.address,
    openingHours: row.opening_hours,
    googlePlaceId: row.google_place_id,
    lat: row.lat,
    lng: row.lng,
    citySlug: row.city_slug,
    cityName: row.city_name,
    country: row.country,
    timezone: row.timezone,
    taxiNumber: row.taxi_number,
    photoUrl: row.photo_url ?? null,
    websiteUri: row.website_uri ?? null,
  };
}

const bandSchema = z.enum(BANDS);

const friendSchema = z.object({
  // Optional: a database not yet migrated omits it and the friend shows the initial.
  user_id: z.string().nullish(),
  handle: z.string(),
  age_band: z.enum(['18-24', '25-34', '35-44', '45+']),
  gender: z.enum(['female', 'male', 'other']),
  intent: z.enum(['going', 'maybe']),
});

const statsRowSchema = z.object({
  // null only for a spot below k = 3 (the server hides even "pochi" there).
  going_band: bandSchema.nullable(),
  maybe_band: bandSchema.nullable(),
  avg_age: z.number().nullable(),
  female_pct: z.number().nullable(),
  male_pct: z.number().nullable(),
  friends: z.array(friendSchema),
  // Optional with a default: a database not yet migrated omits it.
  is_estimate: z.boolean().default(false),
});

export type VenueFriend = {
  userId: string | null;
  handle: string;
  ageBand: '18-24' | '25-34' | '35-44' | '45+';
  gender: 'female' | 'male' | 'other';
  intent: Intent;
};

export type VenueStats = {
  goingBand: Band | null;
  maybeBand: Band | null;
  avgAge: number | null;
  femalePct: number | null;
  malePct: number | null;
  // Bands may include server-side presence; age and gender never do (real declarations only, k >= 3): used only to word the hidden stats.
  isEstimate: boolean;
  friends: VenueFriend[];
};

// Bands always; age and gender split are null when the server found fewer than 3 people (principle 2).
export async function fetchVenueStats(venueId: string, segment: StatsSegment): Promise<VenueStats> {
  const rows = z
    .array(statsRowSchema)
    .parse(await callRpc<unknown>('get_venue_stats', { p_venue_id: venueId, p_segment: segment }));
  const row = rows[0];
  if (!row) throw new RpcError('NOT_FOUND');
  return {
    goingBand: row.going_band,
    maybeBand: row.maybe_band,
    avgAge: row.avg_age,
    femalePct: row.female_pct,
    malePct: row.male_pct,
    isEstimate: row.is_estimate,
    friends: row.friends.map((friend) => ({
      userId: friend.user_id ?? null,
      handle: friend.handle,
      ageBand: friend.age_band,
      gender: friend.gender,
      intent: friend.intent,
    })),
  };
}

// The server keeps a single active plan per user: declaring somewhere else replaces the old one.
export async function declare(target: DeclarationTarget, intent: Intent): Promise<void> {
  const where = target.kind === 'night' ? { p_venue_id: target.id } : { p_event_id: target.id };
  await callRpc<unknown>('declare', { p_intent: intent, ...where });
}

export async function undeclare(): Promise<void> {
  await callRpc<unknown>('undeclare');
}

const refreshResponseSchema = z.object({ refreshed: z.boolean() });

// The server decides whether Google is called at all (only if details are missing or older than 30 days):
// a fresh venue answers `refreshed: false` at no cost. The Google key never reaches the client.
export async function refreshVenueDetails(venueId: string): Promise<{ refreshed: boolean }> {
  const { data, error } = await supabase.functions.invoke('places-detail', {
    body: { venue_id: venueId },
  });
  if (error) throw new Error('places-detail failed');
  return refreshResponseSchema.parse(data);
}
