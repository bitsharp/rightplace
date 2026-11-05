import {
  handleSharedPhotoUrls,
  SIGNED_URL_TTL_SECONDS,
  type SignedPath,
} from '../_shared/photoUrls.ts';

export { SIGNED_URL_TTL_SECONDS };
export type { SignedPath };

export type VisiblePhoto = { messageId: string; photoPath: string };

export type PhotoUrlsDeps = {
  // Runs get_chat_photo_paths with the caller's own JWT: the database decides which photos they may see.
  visiblePhotoPaths: (authorization: string, messageIds: string[]) => Promise<VisiblePhoto[]>;
  // Runs with the service role: Storage has no read policy, signed URLs are the only way out.
  signPaths: (paths: string[], ttlSeconds: number) => Promise<SignedPath[]>;
};

export function handlePhotoUrls(request: Request, deps: PhotoUrlsDeps): Promise<Response> {
  return handleSharedPhotoUrls(
    request,
    { idsKey: 'messageIds', itemKey: 'messageId' },
    {
      signPaths: deps.signPaths,
      visiblePhotoPaths: async (authorization, ids) =>
        (await deps.visiblePhotoPaths(authorization, ids)).map(({ messageId, photoPath }) => ({
          id: messageId,
          photoPath,
        })),
    },
  );
}
