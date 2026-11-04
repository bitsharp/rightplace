import { json, safeEqual } from '../_shared/auth.ts';
import { DEFAULT_MAX_REQUESTS } from '../_shared/places/sync.ts';
import { HARD_MAX_REQUESTS, type SyncQuery } from '../_shared/places/textSearch.ts';
import type { SyncResult } from '../_shared/places/types.ts';

export class CityNotFoundError extends Error {
  constructor() {
    super('NOT_FOUND');
    this.name = 'CityNotFoundError';
  }
}

export class CityNotActiveError extends Error {
  constructor() {
    super('CITY_NOT_ACTIVE');
    this.name = 'CityNotActiveError';
  }
}

export type SyncOutcome = ({ dryRun: false } & SyncResult) | { dryRun: true; queries: SyncQuery[] };

export type SyncOptions = { maxRequests: number; dryRun: boolean };

export type SyncHandlerDeps = {
  syncAdminKey: string;
  runSync: (citySlug: string, options: SyncOptions) => Promise<SyncOutcome>;
  log: (message: string) => void;
};

type ParsedInput = { citySlug: string; options: SyncOptions };

async function parseInput(request: Request): Promise<ParsedInput | null> {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return null;
  }
  const {
    city_slug: citySlug,
    max_requests: max = DEFAULT_MAX_REQUESTS,
    dry_run: dry = false,
  } = body ?? {};
  if (typeof citySlug !== 'string' || citySlug === '') return null;
  if (typeof max !== 'number' || !Number.isInteger(max) || max < 1 || max > HARD_MAX_REQUESTS)
    return null;
  if (typeof dry !== 'boolean') return null;
  return { citySlug, options: { maxRequests: max, dryRun: dry } };
}

function respond(citySlug: string, outcome: SyncOutcome, log: (message: string) => void): Response {
  if (outcome.dryRun) {
    log(`places-sync city=${citySlug} dry_run=true estimated_calls=${outcome.queries.length}`);
    return json({
      city: citySlug,
      dry_run: true,
      estimated_calls: outcome.queries.length,
      queries: outcome.queries,
    });
  }
  log(
    `places-sync city=${citySlug} calls=${outcome.calls} inserted=${outcome.inserted} updated=${outcome.updated} demo_deactivated=${outcome.demoDeactivated}`,
  );
  return json({
    city: citySlug,
    calls: outcome.calls,
    inserted: outcome.inserted,
    updated: outcome.updated,
    demo_deactivated: outcome.demoDeactivated,
  });
}

// Fail closed: an unset SYNC_ADMIN_KEY or a missing/empty header never authorizes (an empty string
// must not equal an empty string).
function isAuthorized(request: Request, syncAdminKey: string): boolean {
  const provided = request.headers.get('x-sync-key');
  if (syncAdminKey === '' || provided === null || provided === '') return false;
  return safeEqual(provided, syncAdminKey);
}

// A sync spends Places quota and writes the venue catalog, so it needs the dedicated SYNC_ADMIN_KEY in
// `x-sync-key`. The Authorization Bearer only passes the Supabase gateway (verify_jwt) and proves nothing here.
export async function handleSync(request: Request, deps: SyncHandlerDeps): Promise<Response> {
  if (!isAuthorized(request, deps.syncAdminKey)) return json({ error: 'UNAUTHORIZED' }, 401);
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const input = await parseInput(request);
  if (input === null) return json({ error: 'INVALID_ARGUMENT' }, 400);

  try {
    return respond(input.citySlug, await deps.runSync(input.citySlug, input.options), deps.log);
  } catch (error) {
    if (error instanceof CityNotFoundError) return json({ error: 'NOT_FOUND' }, 404);
    if (error instanceof CityNotActiveError) return json({ error: 'CITY_NOT_ACTIVE' }, 400);
    deps.log(
      `places-sync city=${input.citySlug} failed: ${error instanceof Error ? error.message : 'unknown'}`,
    );
    return json({ error: 'SYNC_FAILED' }, 502);
  }
}
