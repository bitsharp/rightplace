import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { usePhotoViewerState } from '@/components/app/usePhotoViewerState';
import { useAuthStore } from '@/features/auth/store/authStore';
import { useFollowing } from '@/features/friends/hooks';
import { useMarkRoomRead } from '@/features/notifications/hooks';
import { useMyProfile } from '@/features/profile/hooks';
import { usePhotoFlow } from '@/lib/photos/usePhotoFlow';

import { chatExpiryHours } from './domain/ttl';
import { mentionableHandles } from './domain/mentions';
import type { ChatMessage } from './domain/messages';
import { usePhotoUrls, useMyChatRooms, useRoomMessages, useSendMessage } from './hooks';
import { useFollowByHandle } from './useFollowByHandle';
import { useRoomRealtime } from './useRoomRealtime';

// Who I am (id and handle) and the people I follow, in the shape the chat hooks need.
function useChatPeople() {
  const userId = useAuthStore((state) => state.session?.userId ?? '');
  const myHandle = useMyProfile(userId).data?.handle ?? '';
  const following = useFollowing().data ?? [];
  const people = following.map(({ userId: id, handle }) => ({ userId: id, handle }));
  return { me: { userId, handle: myHandle }, people };
}

export function useNightChatScreen(roomId: string) {
  const { t } = useTranslation('chat');
  const router = useRouter();
  const { me, people } = useChatPeople();
  const room = useMyChatRooms().data?.find((candidate) => candidate.roomId === roomId) ?? null;

  const loaded = useRoomMessages(roomId);
  useRoomRealtime(roomId, me);
  // No visibility filter here: the rule lives in SQL (private.can_see_chat_author_for) and the RPC and Realtime
  // only deliver what this user may see.
  const messages = loaded.messages;
  // newest first: reading is up to date while the room is open, also for messages arriving live
  useMarkRoomRead(roomId, messages[0]?.createdAt ?? null);
  const sender = useSendMessage(roomId, me);
  const photoFlow = usePhotoFlow((cleanUri) => sender.send({ cleanUri }));
  const photos = messages.filter((m) => m.kind === 'photo' && !m.pending && !m.failed);
  const photoUrls = usePhotoUrls(
    roomId,
    photos.map((m) => m.id),
  );
  const [selected, setSelected] = useState<ChatMessage | null>(null);
  const follow = useFollowByHandle();
  // Same photos, same order as the "FOTO DELLA SERATA" strip.
  const viewer = usePhotoViewerState(
    photos.map((m) => ({ id: m.id, uri: photoUrls[m.id], cacheKey: m.id })),
  );

  return {
    title: room ? t('venueTitle', { venue: room.eventName ?? room.venueName }) : t('nightTitle'),
    messages,
    photos: photos.map((m) => ({ id: m.id, handle: m.handle, uri: photoUrls[m.id] })),
    photoUrls,
    loadFailed: loaded.isError,
    hasMore: loaded.hasMore,
    loadOlder: loaded.loadOlder,
    followingHandles: people.map((p) => p.handle),
    mentionableHandles: mentionableHandles(
      messages.map((m) => m.handle),
      people.map((p) => p.handle),
      me.handle,
    ),
    myHandle: me.handle,
    expiryHours: room ? chatExpiryHours(room.expiresAt, new Date()) : null,
    send: (text: string) => sender.send({ text }),
    retry: sender.retry,
    photoFlow,
    viewer,
    selected,
    select: setSelected,
    requestedHandles: follow.requested,
    follow: follow.follow,
    goBack: () => (router.canGoBack() ? router.back() : router.replace('/chat')),
  };
}
