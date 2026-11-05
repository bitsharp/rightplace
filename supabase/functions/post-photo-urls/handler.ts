import {
  handleSharedPhotoUrls,
  SIGNED_URL_TTL_SECONDS,
  type SignedPath,
} from '../_shared/photoUrls.ts';

export { SIGNED_URL_TTL_SECONDS };
export type { SignedPath };

export type VisiblePostPhoto = { postId: string; photoPath: string };

export type PostPhotoUrlsDeps = {
  // Runs get_post_photo_paths with the caller's own JWT: the database decides which photos they may see.
  visiblePhotoPaths: (authorization: string, postIds: string[]) => Promise<VisiblePostPhoto[]>;
  // Runs with the service role: Storage has no read policy, signed URLs are the only way out.
  signPaths: (paths: string[], ttlSeconds: number) => Promise<SignedPath[]>;
};

export function handlePostPhotoUrls(request: Request, deps: PostPhotoUrlsDeps): Promise<Response> {
  return handleSharedPhotoUrls(
    request,
    { idsKey: 'postIds', itemKey: 'postId' },
    {
      signPaths: deps.signPaths,
      visiblePhotoPaths: async (authorization, ids) =>
        (await deps.visiblePhotoPaths(authorization, ids)).map(({ postId, photoPath }) => ({
          id: postId,
          photoPath,
        })),
    },
  );
}
