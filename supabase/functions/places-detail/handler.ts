import { json } from '../_shared/auth.ts';
import { detailsToRow, isRealPlaceId, shouldRefresh } from '../_shared/places/details.ts';
import type { VenueKind, VenueRow } from '../_shared/places/types.ts';

export type VenueRecord = {
  id: string;
  googlePlaceId: string;
  kind: VenueKind;
  citySlug: string;
  placesSyncedAt: Date | null;
};

export type DetailHandlerDeps = {
  getUserId: (request: Request) => Promise<string | null>;
  getVenue: (venueId: string) => Promise<VenueRecord | null>;
  fetchDetails: (placeId: string) => Promise<unknown>;
  saveRow: (citySlug: string, row: VenueRow) => Promise<void>;
  now: () => Date;
};

async function readVenueId(request: Request): Promise<string | null> {
  try {
    const body = await request.json();
    return typeof body?.venue_id === 'string' && body.venue_id !== '' ? body.venue_id : null;
  } catch {
    return null;
  }
}

async function refresh(venue: VenueRecord, deps: DetailHandlerDeps): Promise<Response> {
  try {
    const row = detailsToRow(await deps.fetchDetails(venue.googlePlaceId), venue.kind);
    if (row === null) return json({ error: 'PLACE_UNAVAILABLE' }, 502);
    await deps.saveRow(venue.citySlug, row);
    return json({ refreshed: true });
  } catch {
    return json({ error: 'REFRESH_FAILED' }, 502);
  }
}

// Called by the app with the user's JWT. The decision to hit Google is server-side only.
export async function handleDetail(request: Request, deps: DetailHandlerDeps): Promise<Response> {
  if ((await deps.getUserId(request)) === null) return json({ error: 'UNAUTHORIZED' }, 401);
  const venueId = await readVenueId(request);
  if (venueId === null) return json({ error: 'INVALID_ARGUMENT' }, 400);

  const venue = await deps.getVenue(venueId);
  if (venue === null) return json({ error: 'NOT_FOUND' }, 404);
  if (!isRealPlaceId(venue.googlePlaceId) || !shouldRefresh(venue.placesSyncedAt, deps.now())) {
    return json({ refreshed: false });
  }
  return refresh(venue, deps);
}
