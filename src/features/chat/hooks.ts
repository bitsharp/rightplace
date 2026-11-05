import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useState } from 'react';

import { useBlockUser } from '@/features/friends/hooks';

import {
  fetchMyChatRooms,
  fetchPhotoUrls,
  fetchRoomMessages,
  MESSAGES_PAGE_SIZE,
  reportMessage,
} from './api';
import { mergeFresh, mergeOlder, type ChatMessage } from './domain/messages';
import { CHAT_MESSAGES_ROOT_KEY, CHAT_ROOMS_KEY, chatPhotoUrlsKey, roomMessagesKey } from './keys';

export * from './keys';
export { useSendMessage } from './useSendMessage';

export const CHAT_ROOMS_REFETCH_MS = 60 * 1000;
// Signed URLs live 1 hour: renew a little before.
export const PHOTO_URL_STALE_MS = 50 * 60 * 1000;
const MAX_PHOTOS_PER_REQUEST = 100;

// Principle 5: nothing of a chat is ever written to the on-disk query cache.
const PRIVATE = { persist: false } as const;

export function useMyChatRooms() {
  const focused = useIsFocused();
  return useQuery({
    queryKey: CHAT_ROOMS_KEY,
    queryFn: fetchMyChatRooms,
    refetchInterval: focused ? CHAT_ROOMS_REFETCH_MS : false,
    refetchOnWindowFocus: true,
    meta: PRIVATE,
  });
}

// Newest first. The cache holds the newest page plus whatever older pages were scrolled to;
// realtime appends to it (useRoomRealtime).
export function useRoomMessages(roomId: string) {
  const queryClient = useQueryClient();
  const key = roomMessagesKey(roomId);
  const [exhausted, setExhausted] = useState(false);
  const query = useQuery({
    queryKey: key,
    queryFn: async () =>
      mergeFresh(
        queryClient.getQueryData<ChatMessage[]>(key) ?? [],
        await fetchRoomMessages(roomId),
        MESSAGES_PAGE_SIZE,
      ),
    refetchOnWindowFocus: true,
    meta: PRIVATE,
  });
  const messages = query.data ?? [];

  const loadOlder = async () => {
    const oldest = messages.findLast((message) => !message.pending && !message.failed);
    if (!oldest) return;
    const page = await fetchRoomMessages(roomId, oldest.createdAt);
    queryClient.setQueryData<ChatMessage[]>(key, (list) => mergeOlder(list ?? [], page));
    if (page.length < MESSAGES_PAGE_SIZE) setExhausted(true);
  };

  return {
    messages,
    isLoading: query.isLoading,
    isError: query.isError,
    hasMore: !exhausted && messages.length >= MESSAGES_PAGE_SIZE,
    loadOlder,
  };
}

// Photos have no public URL (principle 6): thumbnails and bubbles use signed URLs from the Edge Function.
export function usePhotoUrls(roomId: string, messageIds: string[]): Record<string, string> {
  const ids = messageIds.slice(0, MAX_PHOTOS_PER_REQUEST);
  const query = useQuery({
    queryKey: chatPhotoUrlsKey(roomId, ids),
    queryFn: () => fetchPhotoUrls(ids),
    enabled: ids.length > 0,
    staleTime: PHOTO_URL_STALE_MS,
    refetchInterval: PHOTO_URL_STALE_MS,
    placeholderData: keepPreviousData,
    meta: PRIVATE,
  });
  return query.data ?? {};
}

export function useReportChatMessage() {
  return useMutation({ mutationFn: (messageId: string) => reportMessage(messageId) });
}

// After a block the person's messages must vanish at once: reset (not just refetch) so a stale
// copy never flashes, and reload the room list because its last message may have been theirs.
export function useBlockChatUser() {
  const queryClient = useQueryClient();
  const block = useBlockUser();
  return {
    isPending: block.isPending,
    mutate: (userId: string, options?: { onSuccess?: () => void }) =>
      block.mutate(userId, {
        onSuccess: () => {
          void queryClient.resetQueries({ queryKey: CHAT_MESSAGES_ROOT_KEY });
          void queryClient.invalidateQueries({ queryKey: CHAT_ROOMS_KEY });
          options?.onSuccess?.();
        },
      }),
  };
}
