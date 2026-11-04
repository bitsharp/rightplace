import {
  buildTextSearchRequest,
  HARD_MAX_REQUESTS,
  languageFor,
  queriesForCity,
  type SyncQuery,
  toVenueRows,
} from './textSearch.ts';
import type { SyncCity, SyncResult, UpsertCounts, VenueRow } from './types.ts';

export const DEFAULT_MAX_REQUESTS = 10;

export type SyncDeps = {
  fetch: (input: string, init?: RequestInit) => Promise<Response>;
  apiKey: string;
  upsert: (rows: VenueRow[]) => Promise<UpsertCounts>;
};

function assertValidMax(maxRequests: number): void {
  if (!Number.isInteger(maxRequests) || maxRequests < 1 || maxRequests > HARD_MAX_REQUESTS) {
    throw new Error('INVALID_MAX_REQUESTS');
  }
}

// What a sync would send to Google: used by dry runs, which never call it.
export function planSync(city: SyncCity, maxRequests: number): SyncQuery[] {
  assertValidMax(maxRequests);
  return queriesForCity(city, maxRequests);
}

async function runQuery(deps: SyncDeps, city: SyncCity, query: SyncQuery): Promise<VenueRow[]> {
  const { url, init } = buildTextSearchRequest(
    query,
    city.center,
    deps.apiKey,
    city.radiusM,
    languageFor(city.country),
  );
  const response = await deps.fetch(url, init);
  if (!response.ok) throw new Error(`PLACES_HTTP_${response.status}`);
  return toVenueRows(await response.json(), query.kind);
}

// One Text Search call per planned query, so calls <= maxRequests by construction.
export async function syncCity(
  deps: SyncDeps,
  city: SyncCity,
  maxRequests: number = DEFAULT_MAX_REQUESTS,
): Promise<SyncResult> {
  const queries = planSync(city, maxRequests);
  const rows = new Map<string, VenueRow>();
  for (const query of queries) {
    for (const row of await runQuery(deps, city, query)) {
      if (!rows.has(row.google_place_id)) rows.set(row.google_place_id, row);
    }
  }
  const counts = await deps.upsert([...rows.values()]);
  return { calls: queries.length, ...counts };
}
