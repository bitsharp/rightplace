import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useState } from 'react';

import { useBlockUser } from '@/features/friends/hooks';

import {
  DM_PAGE_SIZE,
  fetchDmMessages,
  fetchDmThreads,
  fetchDmUnreadCount,
  markDmRead,
  openDmThread,
  reportDm,
} from './api';
import { appendDm, type DmMessage } from './domain/messages';
import { DM_MESSAGES_ROOT_KEY, DM_THREADS_KEY, DM_UNREAD_KEY, dmMessagesKey } from './keys';

export * from './keys';
export { useSendDm } from './useSendDm';

export const DM_REFETCH_MS = 60 * 1000;

// Principle 5: nothing of a conversation is ever written to the on-disk query cache.
const PRIVATE = { persist: false } as const;

export function useDmThreads() {
  const focused = useIsFocused();
  return useQuery({
    queryKey: DM_THREADS_KEY,
    queryFn: fetchDmThreads,
    refetchInterval: focused ? DM_REFETCH_MS : false,
    refetchOnWindowFocus: true,
    meta: PRIVATE,
  });
}

// Chat tab badge: conversations with something I have not read. Refreshed on focus, by polling and by realtime.
export function useDmUnreadCount(): number {
  const focused = useIsFocused();
  const query = useQuery({
    queryKey: DM_UNREAD_KEY,
    queryFn: fetchDmUnreadCount,
    refetchInterval: focused ? DM_REFETCH_MS : false,
    refetchOnWindowFocus: true,
    meta: PRIVATE,
  });
  return query.data ?? 0;
}

// Newest first. The cache holds the newest page plus whatever older pages were scrolled to.
export function useDmMessages(threadId: string) {
  const queryClient = useQueryClient();
  const key = dmMessagesKey(threadId);
  const [exhausted, setExhausted] = useState(false);
  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchDmMessages(threadId),
    refetchOnWindowFocus: true,
    meta: PRIVATE,
  });
  const messages = query.data ?? [];

  const loadOlder = async () => {
    const oldest = messages.at(-1);
    if (!oldest) return;
    const page = await fetchDmMessages(threadId, oldest.createdAt);
    queryClient.setQueryData<DmMessage[]>(key, (list) => page.reduce(appendDm, list ?? []));
    if (page.length < DM_PAGE_SIZE) setExhausted(true);
  };

  return {
    messages,
    isLoading: query.isLoading,
    isError: query.isError,
    hasMore: !exhausted && messages.length >= DM_PAGE_SIZE,
    loadOlder,
  };
}

export function useOpenDmThread() {
  return useMutation({ mutationFn: (handle: string) => openDmThread(handle) });
}

export function useMarkDmRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => markDmRead(threadId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DM_THREADS_KEY });
      void queryClient.invalidateQueries({ queryKey: DM_UNREAD_KEY });
    },
  });
}

export function useReportDm() {
  return useMutation({ mutationFn: (messageId: string) => reportDm(messageId) });
}

// After a block the conversation must vanish at once: reset (not just refetch) so a stale copy never flashes.
export function useBlockDmUser() {
  const queryClient = useQueryClient();
  const block = useBlockUser();
  return {
    isPending: block.isPending,
    mutate: (userId: string, options?: { onSuccess?: () => void }) =>
      block.mutate(userId, {
        onSuccess: () => {
          void queryClient.resetQueries({ queryKey: DM_MESSAGES_ROOT_KEY });
          void queryClient.invalidateQueries({ queryKey: DM_THREADS_KEY });
          void queryClient.invalidateQueries({ queryKey: DM_UNREAD_KEY });
          options?.onSuccess?.();
        },
      }),
  };
}
