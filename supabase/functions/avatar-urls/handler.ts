import {
  handleSharedPhotoUrls,
  SIGNED_URL_TTL_SECONDS,
  type SignedPath,
} from '../_shared/photoUrls.ts';

export { SIGNED_URL_TTL_SECONDS };
export type { SignedPath };

export type VisibleAvatar = { userId: string; avatarPath: string };

export type AvatarUrlsDeps = {
  // Runs get_avatar_paths with the caller's own JWT: the database decides whose photo they may see
  // (their own and accepted follows', never across a block).
  visibleAvatarPaths: (authorization: string, userIds: string[]) => Promise<VisibleAvatar[]>;
  // Runs with the service role: Storage has no read policy, signed URLs are the only way out.
  signPaths: (paths: string[], ttlSeconds: number) => Promise<SignedPath[]>;
};

export function handleAvatarUrls(request: Request, deps: AvatarUrlsDeps): Promise<Response> {
  return handleSharedPhotoUrls(
    request,
    { idsKey: 'userIds', itemKey: 'userId' },
    {
      signPaths: deps.signPaths,
      visiblePhotoPaths: async (authorization, ids) =>
        (await deps.visibleAvatarPaths(authorization, ids)).map(({ userId, avatarPath }) => ({
          id: userId,
          photoPath: avatarPath,
        })),
    },
  );
}
