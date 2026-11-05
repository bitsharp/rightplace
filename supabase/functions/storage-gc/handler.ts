import { json, safeEqual } from '../_shared/auth.ts';

export type QueuedFile = { id: number; bucketId: string; objectPath: string };

export type GcDeps = {
  gcKey: string;
  claim: () => Promise<QueuedFile[]>;
  // Throws on error. Removing an object that is already gone is a successful no-op, so no error means done.
  remove: (bucketId: string, paths: string[]) => Promise<void>;
  complete: (ids: number[]) => Promise<void>;
  log: (message: string) => void;
};

// Fail closed: an unset STORAGE_GC_KEY or a missing/empty header never authorizes.
function isAuthorized(request: Request, gcKey: string): boolean {
  const provided = request.headers.get('x-gc-key');
  if (gcKey === '' || provided === null || provided === '') return false;
  return safeEqual(provided, gcKey);
}

function groupByBucket(files: QueuedFile[]): Map<string, QueuedFile[]> {
  const groups = new Map<string, QueuedFile[]>();
  for (const file of files) groups.set(file.bucketId, [...(groups.get(file.bucketId) ?? []), file]);
  return groups;
}

async function removeBucket(
  bucketId: string,
  files: QueuedFile[],
  deps: GcDeps,
): Promise<number[]> {
  try {
    await deps.remove(bucketId, [...new Set(files.map((f) => f.objectPath))]);
    return files.map((file) => file.id);
  } catch {
    // logged without paths: file names carry user ids
    deps.log(`storage-gc bucket=${bucketId} remove failed`);
    return [];
  }
}

// Called by pg_cron through pg_net, so there is no user JWT: the only credential is `x-gc-key`.
export async function handleGc(request: Request, deps: GcDeps): Promise<Response> {
  if (!isAuthorized(request, deps.gcKey)) return json({ error: 'UNAUTHORIZED' }, 401);
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  try {
    const files = await deps.claim();
    const doneIds: number[] = [];
    for (const [bucketId, group] of groupByBucket(files)) {
      doneIds.push(...(await removeBucket(bucketId, group, deps)));
    }
    if (doneIds.length > 0) await deps.complete(doneIds.sort((a, b) => a - b));
    deps.log(`storage-gc removed=${doneIds.length} failed=${files.length - doneIds.length}`);
    return json({ removed: doneIds.length, failed: files.length - doneIds.length });
  } catch {
    deps.log('storage-gc failed');
    return json({ error: 'GC_FAILED' }, 502);
  }
}
