import { z } from 'zod';

import { BANDS } from '@/features/nights/domain/band';
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
  going_band: bandSchema,
  maybe_band: bandSchema,
  is_hot_spot: z.boolean(),
  is_sponsored: z.boolean(),
  friends_going: z.array(z.string()).nullable(),
  friends_count: z.number().int().nullable(),
});

// Bands and typical levels only: k-anonymity is enforced inside get_city_map (principles 2, 11).
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
      friendsCount: row.friends_count,
    }));
}

const declarationRowSchema = z.object({
  venue_id: z.string(),
  venue_name: z.string(),
  intent: z.enum(['going', 'maybe']),
  expires_at: z.string(),
});

export type MyDeclaration = {
  venueId: string;
  venueName: string;
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
});

export type RecommendedVenue = {
  venueId: string;
  name: string;
  kind: VenueKind;
  reason: 'history' | 'hot';
};

export async function fetchRecommendedVenue(citySlug: string): Promise<RecommendedVenue | null> {
  const rows = z
    .array(recommendedRowSchema)
    .parse(await callRpc<unknown>('get_recommended_venue', { p_city_slug: citySlug }));
  const row = rows[0];
  if (!row) return null;
  return { venueId: row.venue_id, name: row.name, kind: row.kind, reason: row.reason };
}
