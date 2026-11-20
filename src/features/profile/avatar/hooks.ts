import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { clearAvatar, fetchAvatarUrls, uploadAndSetAvatar } from './api';
import { normalizeAvatarIds } from './avatarIds';
import { AVATAR_URLS_ROOT_KEY, avatarUrlsKey } from './keys';

// Signed URLs live 1 hour: renew a little before.
export const AVATAR_URL_STALE_MS = 50 * 60 * 1000;

// Principle 1: nobody's photo URL is ever written to disk.
const PRIVATE = { persist: false } as const;

// One request for a whole list. Only the photos the viewer may see come back; the others are missing from
// the map and the Avatar shows the initial.
export function useAvatarUrls(userIds: readonly (string | null | undefined)[]) {
  const ids = normalizeAvatarIds(userIds);
  const query = useQuery({
    queryKey: avatarUrlsKey(ids),
    queryFn: () => fetchAvatarUrls(ids),
    enabled: ids.length > 0,
    staleTime: AVATAR_URL_STALE_MS,
    refetchInterval: AVATAR_URL_STALE_MS,
    placeholderData: keepPreviousData,
    meta: PRIVATE,
  });
  return query.data ?? {};
}

export function useChangeAvatar(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cleanUri: string) => uploadAndSetAvatar(userId, cleanUri),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AVATAR_URLS_ROOT_KEY }),
  });
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearAvatar,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: AVATAR_URLS_ROOT_KEY }),
  });
}
