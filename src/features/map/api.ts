import { z } from 'zod';

import { BANDS, type Band } from '@/features/nights/domain/band';
import { VENUE_KINDS, type VenueKind } from '@/features/venues/domain/venueList';
import { callRpc } from '@/lib/callRpc';

import type { MapVenue } from './domain/mapLayers';
import type { MapViewMode } from './store/mapStore';

const bandSchema = z.enum(BANDS);

const mapRowSchema = z.object({
  venue_id: z.string(),
  name: z.string(),
  kind: z.enum(VENUE_KINDS),
  lat: z.number(),
  lng: z.number(),
  typical_level: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  going_band: bandSchema.nullable(),
  maybe_band: bandSchema.nullable(),
  is_hot_spot: z.boolean(),
  is_sponsored: z.boolean(),
  friends_going: z.array(z.string()).nullable(),
  // Same order and length as friends_going; only for accepted follows, only in the friends view.
  // Optional: a database not yet migrated omits it and the friends simply show their initial.
  friends_going_ids: z.array(z.string()).nullish(),
  friends_count: z.number().int().nullable(),
  is_spot: z.boolean().default(false),
  // Optional with a default: a database not yet migrated omits it and the map shows no STIMA.
  is_estimate: z.boolean().default(false),
});

// Bands and typical levels only: k-anonymity is enforced inside get_city_map (principles 2, 11).
// A spot below k arrives with null bands; the creator of a spot is never part of the row.
export async function fetchCityMap(citySlug: string, view: MapViewMode): Promise<MapVenue[]> {
  const data = await callRpc<unknown>('get_city_map', { p_city_slug: citySlug, p_view: view });
  return z
    .array(mapRowSchema)
    .parse(data)
    .map((row) => ({
      venueId: row.venue_id,
      name: row.name,
      kind: row.kind,
      lat: row.lat,
      lng: row.lng,
      typicalLevel: row.typical_level,
      goingBand: row.going_band,
      maybeBand: row.maybe_band,
      isHotSpot: row.is_hot_spot,
      isSponsored: row.is_sponsored,
      friendsGoing: row.friends_going,
      friendIds: row.friends_going_ids ?? null,
      friendsCount: row.friends_count,
      isSpot: row.is_spot,
      isEstimate: row.is_estimate,
    }));
}

const declarationRowSchema = z.object({
  venue_id: z.string(),
  venue_name: z.string(),
  event_id: z.string().nullable(),
  intent: z.enum(['going', 'maybe']),
  expires_at: z.string(),
});

export type MyDeclaration = {
  venueId: string;
  venueName: string;
  eventId: string | null;
  intent: 'going' | 'maybe';
  expiresAt: string;
};

// Own active declaration only (the RPC reads auth.uid()).
export async function fetchMyDeclaration(): Promise<MyDeclaration | null> {
  const rows = z.array(declarationRowSchema).parse(await callRpc<unknown>('get_my_declaration'));
  const row = rows[0];
  if (!row) return null;
  return {
    venueId: row.venue_id,
    venueName: row.venue_name,
    eventId: row.event_id,
    intent: row.intent,
    expiresAt: row.expires_at,
  };
}

const storyRowSchema = z.object({
  user_id: z.string(),
  handle: z.string(),
  latest_post_at: z.string(),
});

export type StoryEntry = { userId: string; handle: string; latestPostAt: string };

// Accepted follows with a post in the last 24 hours (filtered server-side, principle 6).
export async function fetchStories(): Promise<StoryEntry[]> {
  const rows = z.array(storyRowSchema).parse(await callRpc<unknown>('get_stories'));
  return rows.map((row) => ({
    userId: row.user_id,
    handle: row.handle,
    latestPostAt: row.latest_post_at,
  }));
}

const recommendedRowSchema = z.object({
  venue_id: z.string(),
  name: z.string(),
  kind: z.enum(VENUE_KINDS),
  reason: z.enum(['history', 'hot']),
  is_estimate: z.boolean().default(false),
});

export type RecommendedVenue = {
  venueId: string;
  name: string;
  kind: VenueKind;
  reason: 'history' | 'hot';
  isEstimate: boolean;
};

export async function fetchRecommendedVenue(citySlug: string): Promise<RecommendedVenue | null> {
  const rows = z
    .array(recommendedRowSchema)
    .parse(await callRpc<unknown>('get_recommended_venue', { p_city_slug: citySlug }));
  const row = rows[0];
  if (!row) return null;
  return {
    venueId: row.venue_id,
    name: row.name,
    kind: row.kind,
    reason: row.reason,
    isEstimate: row.is_estimate,
  };
}

const busiestRowSchema = z.object({
  venue_id: z.string(),
  name: z.string(),
  kind: z.enum(VENUE_KINDS),
  typical_level: z.union([z.literal(2), z.literal(3)]),
  cover_photo_url: z.string().nullish(),
  going_band: bandSchema,
  maybe_band: bandSchema,
  is_estimate: z.boolean().default(false),
});

export type BusiestVenue = {
  venueId: string;
  name: string;
  kind: VenueKind;
  // Only 2 ("animato") and 3 ("pieno"): the server lists nothing quieter.
  typicalLevel: 2 | 3;
  photoUrl: string | null;
  goingBand: Band;
  maybeBand: Band;
  isEstimate: boolean;
};

// "I più animati": the "di solito" level of now and the next hours, plus tonight's bands. Catalog data and
// bands only, no person (principles 2, 11); the bands may include estimated presence (isEstimate).
export async function fetchBusiestTonight(citySlug: string): Promise<BusiestVenue[]> {
  const data = await callRpc<unknown>('get_busiest_tonight', { p_city_slug: citySlug });
  return z
    .array(busiestRowSchema)
    .parse(data)
    .map((row) => ({
      venueId: row.venue_id,
      name: row.name,
      kind: row.kind,
      typicalLevel: row.typical_level,
      photoUrl: row.cover_photo_url ?? null,
      goingBand: row.going_band,
      maybeBand: row.maybe_band,
      isEstimate: row.is_estimate,
    }));
}
