import { z } from 'zod';

export const MAX_RECENT_VENUES = 8;

export type RecentVenue = { venueId: string; name: string };

const rowSchema = z.object({
  venue_id: z.string(),
  searched_at: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
  venues: z.object({ name: z.string(), is_active: z.boolean() }),
});

// Rows of search_history with the venue embedded; anything malformed or inactive is dropped.
export function parseRecentVenues(rows: unknown): RecentVenue[] {
  if (!Array.isArray(rows)) return [];
  return rows
    .flatMap((row) => {
      const parsed = rowSchema.safeParse(row);
      return parsed.success && parsed.data.venues.is_active ? [parsed.data] : [];
    })
    .sort((a, b) => Date.parse(b.searched_at) - Date.parse(a.searched_at))
    .slice(0, MAX_RECENT_VENUES)
    .map((row) => ({ venueId: row.venue_id, name: row.venues.name }));
}
