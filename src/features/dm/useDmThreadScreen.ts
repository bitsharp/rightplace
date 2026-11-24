import { useIsFocused, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';

import { useAuthStore } from '@/features/auth/store/authStore';
import { useAvatarUrls } from '@/features/profile/avatar/hooks';
import { avatarPhotoFor } from '@/features/profile/avatar/avatarPhoto';

import { dmErrorOf } from './api';
import type { DmMessage } from './domain/messages';
import { useDmMessages, useDmThreads, useMarkDmRead, useSendDm } from './hooks';
import { useDmRealtime } from './useDmRealtime';

type Hint = { handle?: string; userId?: string };

// Everything the conversation screen needs. The other person's handle and id come from the route (opened from the
// inbox or a profile) or, for a push deep link, from the inbox list.
export function useDmThreadScreen(threadId: string, hint: Hint) {
  const router = useRouter();
  const focused = useIsFocused();
  const meId = useAuthStore((state) => state.session?.userId ?? '');
  const thread = useDmThreads().data?.find((candidate) => candidate.threadId === threadId);
  const handle = hint.handle ?? thread?.otherHandle ?? null;
  const userId = hint.userId ?? thread?.otherUserId ?? null;

  const loaded = useDmMessages(threadId);
  useDmRealtime(threadId, meId);
  const sender = useSendDm(threadId, meId);
  const markRead = useMarkDmRead();
  const avatars = useAvatarUrls([userId ?? undefined]);
  const [selected, setSelected] = useState<DmMessage | null>(null);

  // Open, and every time something new arrives while the screen is in front: it is read.
  const newestId = loaded.messages[0]?.id ?? null;
  const { mutate: mark } = markRead;
  useEffect(() => {
    if (focused) mark(threadId);
  }, [focused, threadId, newestId, mark]);

  // The friendship ended (a block, an unfollow): the server says so on the first call and the composer closes.
  const closed =
    sender.error === 'NOT_LINKED' ||
    (markRead.isError && dmErrorOf(markRead.error) === 'NOT_LINKED');

  return {
    handle,
    avatarPhoto: avatarPhotoFor(avatars, userId),
    messages: loaded.messages,
    loadFailed: loaded.isError,
    hasMore: loaded.hasMore,
    loadOlder: () => void loaded.loadOlder(),
    closed,
    sendError: sender.error === 'NOT_LINKED' ? null : sender.error,
    isSending: sender.isSending,
    send: (text: string, onSent: () => void) => sender.send(text, { onSuccess: onSent }),
    selected,
    select: setSelected,
    openProfile: () => handle && router.push(`/u/${handle}`),
    goBack: () => (router.canGoBack() ? router.back() : router.replace('/chat')),
  };
}
