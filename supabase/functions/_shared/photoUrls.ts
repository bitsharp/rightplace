import { bearerToken, json } from './auth.ts';

export const SIGNED_URL_TTL_SECONDS = 3600;
const MAX_IDS = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type VisiblePhoto = { id: string; photoPath: string };
export type SignedPath = { path: string; signedUrl: string };

// What differs between the chat and the posts: the names in the request body and in the response.
export type PhotoUrlsShape = { idsKey: string; itemKey: string };

export type SharedPhotoUrlsDeps = {
  // Runs the RPC with the caller's own JWT: the database decides which photos they may see.
  visiblePhotoPaths: (authorization: string, ids: string[]) => Promise<VisiblePhoto[]>;
  // Runs with the service role: Storage has no read policy, signed URLs are the only way out.
  signPaths: (paths: string[], ttlSeconds: number) => Promise<SignedPath[]>;
};

async function readIds(request: Request, idsKey: string): Promise<string[] | null> {
  try {
    const body = await request.json();
    const ids: unknown = body?.[idsKey];
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > MAX_IDS) return null;
    return ids.every((id) => typeof id === 'string' && UUID.test(id)) ? (ids as string[]) : null;
  } catch {
    return null;
  }
}

// Never builds a public URL and never signs a path the database did not return for this caller.
export async function handleSharedPhotoUrls(
  request: Request,
  shape: PhotoUrlsShape,
  deps: SharedPhotoUrlsDeps,
): Promise<Response> {
  if (bearerToken(request) === null) return json({ error: 'UNAUTHORIZED' }, 401);
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  const ids = await readIds(request, shape.idsKey);
  if (ids === null) return json({ error: 'INVALID_ARGUMENT' }, 400);

  try {
    const authorization = request.headers.get('Authorization') ?? '';
    const visible = await deps.visiblePhotoPaths(authorization, ids);
    if (visible.length === 0) return json({ urls: [] });
    const signed = await deps.signPaths(
      visible.map((photo) => photo.photoPath),
      SIGNED_URL_TTL_SECONDS,
    );
    const urlByPath = new Map(signed.map((item) => [item.path, item.signedUrl]));
    const urls = visible.flatMap(({ id, photoPath }) => {
      const url = urlByPath.get(photoPath);
      return url === undefined ? [] : [{ [shape.itemKey]: id, url }];
    });
    return json({ urls });
  } catch {
    return json({ error: 'PHOTO_URLS_FAILED' }, 502);
  }
}
