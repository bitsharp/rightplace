import { json } from '../_shared/auth.ts';
import {
  detailsToRow,
  isRealPlaceId,
  parseSelectionInput,
  type SelectionInput,
  selectionToRow,
  shouldRefresh,
} from '../_shared/places/details.ts';
import type { SearchLanguage, SelectionRow, VenueKind, VenueRow } from '../_shared/places/types.ts';

export type VenueRecord = {
  id: string;
  googlePlaceId: string;
  kind: VenueKind;
  citySlug: string;
  placesSyncedAt: Date | null;
};

export type CachedPlace = { venueId: string; placesSyncedAt: Date | null };

export type DetailHandlerDeps = {
  getUserId: (request: Request) => Promise<string | null>;
  getVenue: (venueId: string) => Promise<VenueRecord | null>;
  fetchDetails: (placeId: string) => Promise<unknown>;
  saveRow: (citySlug: string, row: VenueRow) => Promise<void>;
  // Search selection (Details Pro): cache lookup, the Google call that closes the Autocomplete session, the upsert.
  getCachedPlace: (placeId: string) => Promise<CachedPlace | null>;
  fetchSelection: (
    placeId: string,
    sessionToken: string,
    language: SearchLanguage,
  ) => Promise<unknown>;
  saveSelection: (citySlug: string, row: SelectionRow) => Promise<string>;
  now: () => Date;
};

async function readBody(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : null;
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

async function handleVenue(venueId: string, deps: DetailHandlerDeps): Promise<Response> {
  const venue = await deps.getVenue(venueId);
  if (venue === null) return json({ error: 'NOT_FOUND' }, 404);
  if (!isRealPlaceId(venue.googlePlaceId) || !shouldRefresh(venue.placesSyncedAt, deps.now())) {
    return json({ refreshed: false });
  }
  return refresh(venue, deps);
}

// A cache hit younger than 30 days answers without Google. The Autocomplete session then stays open and its requests
// are billed, which still costs less than the Details call it saves.
async function handleSelection(
  selection: SelectionInput,
  deps: DetailHandlerDeps,
): Promise<Response> {
  const cached = await deps.getCachedPlace(selection.placeId);
  if (cached !== null && !shouldRefresh(cached.placesSyncedAt, deps.now())) {
    return json({ venue_id: cached.venueId });
  }
  try {
    const row = selectionToRow(
      await deps.fetchSelection(selection.placeId, selection.sessionToken, selection.language),
    );
    if (row === null) return json({ error: 'SELECTION_FAILED' }, 502);
    return json({ venue_id: await deps.saveSelection(selection.citySlug, row) });
  } catch (error) {
    if (error instanceof Error && error.message === 'OUT_OF_CITY')
      return json({ error: 'OUT_OF_CITY' }, 422);
    return json({ error: 'SELECTION_FAILED' }, 502);
  }
}

// Called by the app with the user's JWT. The decision to hit Google is server-side only.
export async function handleDetail(request: Request, deps: DetailHandlerDeps): Promise<Response> {
  if ((await deps.getUserId(request)) === null) return json({ error: 'UNAUTHORIZED' }, 401);
  const body = await readBody(request);
  if (body !== null && 'place_id' in body) {
    const selection = parseSelectionInput(body);
    return selection === null
      ? json({ error: 'INVALID_ARGUMENT' }, 400)
      : handleSelection(selection, deps);
  }
  const venueId = body?.venue_id;
  if (typeof venueId !== 'string' || venueId === '')
    return json({ error: 'INVALID_ARGUMENT' }, 400);
  return handleVenue(venueId, deps);
}
