import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { clearAvatar, fetchAvatarUrls, uploadAndSetAvatar } from './api';
import { normalizeAvatarIds } from './avatarIds';
import { AVATAR_URLS_ROOT_KEY, AVATAR_USER_ROOT_KEY, avatarUrlsKey, avatarUserKey } from './keys';

// Signed URLs live 1 hour: renew a little before.
export const AVATAR_URL_STALE_MS = 50 * 60 * 1000;

// Principle 1: nobody's photo URL is ever written to disk.
const PRIVATE = { persist: false } as const;

type AvatarUrls = Record<string, string>;
type Known = { url: string | null; updatedAt: number };

function knownOf(client: QueryClient, userId: string): Known | null {
  const state = client.getQueryState<string | null>(avatarUserKey(userId));
  return state?.data === undefined ? null : { url: state.data, updatedAt: state.dataUpdatedAt };
}

const isFresh = (known: Known | null): known is Known =>
  known !== null && Date.now() - known.updatedAt < AVATAR_URL_STALE_MS;

function urlsOf(client: QueryClient, ids: readonly string[], freshOnly: boolean): AvatarUrls {
  const urls: AvatarUrls = {};
  for (const id of ids) {
    const known = knownOf(client, id);
    if (known?.url && (!freshOnly || isFresh(known))) urls[id] = known.url;
  }
  return urls;
}

function rememberUrls(client: QueryClient, asked: readonly string[], urls: AvatarUrls) {
  // The key prefix carries persist:false: setQueryData builds the entry with these defaults.
  client.setQueryDefaults(AVATAR_USER_ROOT_KEY, { meta: PRIVATE });
  for (const id of asked) client.setQueryData(avatarUserKey(id), urls[id] ?? null);
}

// Only the people nobody has asked about in the last 50 minutes go to the server.
async function fetchMissing(client: QueryClient, ids: readonly string[]): Promise<AvatarUrls> {
  const missing = ids.filter((id) => !isFresh(knownOf(client, id)));
  if (missing.length > 0) rememberUrls(client, missing, await fetchAvatarUrls(missing));
  return urlsOf(client, ids, false);
}

// Everything already known and fresh: the list needs no request at all.
function completeFromCache(client: QueryClient, ids: readonly string[]) {
  const all = ids.map((id) => knownOf(client, id));
  if (!all.every(isFresh)) return undefined;
  return { urls: urlsOf(client, ids, false), at: Math.min(...all.map((known) => known.updatedAt)) };
}

// One request for a whole list. Only the photos the viewer may see come back; the others are missing from
// the map and the Avatar shows the initial. A URL fetched for one list is reused by every other list.
export function useAvatarUrls(userIds: readonly (string | null | undefined)[]) {
  const client = useQueryClient();
  const ids = normalizeAvatarIds(userIds);
  const cached = completeFromCache(client, ids);
  const query = useQuery({
    queryKey: avatarUrlsKey(ids),
    queryFn: () => fetchMissing(client, ids),
    enabled: ids.length > 0,
    staleTime: AVATAR_URL_STALE_MS,
    refetchInterval: AVATAR_URL_STALE_MS,
    initialData: cached?.urls,
    initialDataUpdatedAt: cached?.at,
    // While the new list loads: what is already known, plus what the previous list showed.
    placeholderData: (previous) => ({ ...previous, ...urlsOf(client, ids, false) }),
    meta: PRIVATE,
  });
  return query.data ?? {};
}

// A new or removed photo makes every remembered URL suspect: forget them, then ask again.
function refreshAvatars(queryClient: QueryClient) {
  queryClient.removeQueries({ queryKey: AVATAR_USER_ROOT_KEY });
  return queryClient.invalidateQueries({ queryKey: AVATAR_URLS_ROOT_KEY });
}

export function useChangeAvatar(userId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cleanUri: string) => uploadAndSetAvatar(userId, cleanUri),
    onSuccess: () => refreshAvatars(queryClient),
  });
}

export function useRemoveAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clearAvatar,
    onSuccess: () => refreshAvatars(queryClient),
  });
}
