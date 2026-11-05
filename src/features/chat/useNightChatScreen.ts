import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuthStore } from '@/features/auth/store/authStore';
import { useFollowing } from '@/features/friends/hooks';
import { useMyProfile } from '@/features/profile/hooks';

import { chatExpiryHours } from './domain/ttl';
import { visibleMessages } from './domain/visibleMessages';
import type { ChatMessage } from './domain/messages';
import { usePhotoUrls, useMyChatRooms, useRoomMessages, useSendMessage } from './hooks';
import { usePhotoFlow } from './usePhotoFlow';
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
  useRoomRealtime(roomId, me, people);
  const messages = visibleMessages(
    loaded.messages,
    me.userId,
    people.map((p) => p.userId),
  );
  const sender = useSendMessage(roomId, me);
  const photoFlow = usePhotoFlow((cleanUri) => sender.send({ cleanUri }));
  const photos = messages.filter((m) => m.kind === 'photo' && !m.pending && !m.failed);
  const photoUrls = usePhotoUrls(
    roomId,
    photos.map((m) => m.id),
  );
  const [selected, setSelected] = useState<ChatMessage | null>(null);
  const follow = useFollowByHandle();

  return {
    title: room ? t('venueTitle', { venue: room.eventName ?? room.venueName }) : t('nightTitle'),
    messages,
    photos: photos.map((m) => ({ id: m.id, handle: m.handle, uri: photoUrls[m.id] })),
    photoUrls,
    loadFailed: loaded.isError,
    hasMore: loaded.hasMore,
    loadOlder: loaded.loadOlder,
    followingHandles: people.map((p) => p.handle),
    myHandle: me.handle,
    expiryHours: room ? chatExpiryHours(room.expiresAt, new Date()) : null,
    send: (text: string) => sender.send({ text }),
    retry: sender.retry,
    photoFlow,
    selected,
    select: setSelected,
    requestedHandles: follow.requested,
    follow: follow.follow,
    goBack: () => (router.canGoBack() ? router.back() : router.replace('/chat')),
  };
}
