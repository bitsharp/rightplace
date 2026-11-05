import { bearerToken, json } from '../_shared/auth.ts';

export const SIGNED_URL_TTL_SECONDS = 3600;
const MAX_IDS = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type VisiblePhoto = { messageId: string; photoPath: string };
export type SignedPath = { path: string; signedUrl: string };

export type PhotoUrlsDeps = {
  // Runs get_chat_photo_paths with the caller's own JWT: the database decides which photos they may see.
  visiblePhotoPaths: (authorization: string, messageIds: string[]) => Promise<VisiblePhoto[]>;
  // Runs with the service role: Storage has no read policy, signed URLs are the only way out.
  signPaths: (paths: string[], ttlSeconds: number) => Promise<SignedPath[]>;
};

async function readMessageIds(request: Request): Promise<string[] | null> {
  try {
    const body = await request.json();
    const ids: unknown = body?.messageIds;
    if (!Array.isArray(ids) || ids.length < 1 || ids.length > MAX_IDS) return null;
    return ids.every((id) => typeof id === 'string' && UUID.test(id)) ? (ids as string[]) : null;
  } catch {
    return null;
  }
}

// Never builds a public URL and never signs a path the database did not return for this caller.
export async function handlePhotoUrls(request: Request, deps: PhotoUrlsDeps): Promise<Response> {
  if (bearerToken(request) === null) return json({ error: 'UNAUTHORIZED' }, 401);
  if (request.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);
  const messageIds = await readMessageIds(request);
  if (messageIds === null) return json({ error: 'INVALID_ARGUMENT' }, 400);

  try {
    const authorization = request.headers.get('Authorization') ?? '';
    const visible = await deps.visiblePhotoPaths(authorization, messageIds);
    if (visible.length === 0) return json({ urls: [] });
    const signed = await deps.signPaths(
      visible.map((photo) => photo.photoPath),
      SIGNED_URL_TTL_SECONDS,
    );
    const urlByPath = new Map(signed.map((item) => [item.path, item.signedUrl]));
    const urls = visible.flatMap(({ messageId, photoPath }) => {
      const url = urlByPath.get(photoPath);
      return url === undefined ? [] : [{ messageId, url }];
    });
    return json({ urls });
  } catch {
    return json({ error: 'PHOTO_URLS_FAILED' }, 502);
  }
}
