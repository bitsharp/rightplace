import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState } from 'react-native';

import { useSession } from '@/features/auth/useSession';
import { useMyChatRooms } from '@/features/chat/hooks';
import { useMyDeclaration } from '@/features/map/hooks';
import { useCurrentCity } from '@/features/map/useCurrentCity';

import {
  fetchActivity,
  fetchCityTimezone,
  fetchNotificationPrefs,
  saveNotificationPrefs,
} from './api';
import type { NotificationPrefs } from './domain/prefs';
import { unreadRooms, unseenActivity } from './domain/unread';
import { usePrePermissionStore } from './prePermission';
import { syncLocalReminders } from './scheduler';
import { useNotificationStore } from './store/notificationStore';

export const NOTIFICATION_PREFS_KEY = ['notificationPrefs'] as const;
export const ACTIVITY_KEY = ['activity'] as const;
export const ACTIVITY_REFETCH_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

// Who liked or followed me never goes to the on-disk query cache.
const PRIVATE = { persist: false } as const;

export function useNotificationPrefs() {
  return useQuery({
    queryKey: NOTIFICATION_PREFS_KEY,
    queryFn: fetchNotificationPrefs,
    meta: PRIVATE,
  });
}

// The new value is on screen at once; a refusal puts the old one back. Reminders follow because
// useReminderSync watches the cached preferences.
export function useSaveNotificationPrefs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<NotificationPrefs>) => saveNotificationPrefs(patch),
    onMutate: async (patch) => {
      await queryClient.cancelQueries({ queryKey: NOTIFICATION_PREFS_KEY });
      const previous = queryClient.getQueryData<NotificationPrefs>(NOTIFICATION_PREFS_KEY);
      if (previous) queryClient.setQueryData(NOTIFICATION_PREFS_KEY, { ...previous, ...patch });
      return { previous };
    },
    onError: (_error, _patch, context) => {
      if (context?.previous) queryClient.setQueryData(NOTIFICATION_PREFS_KEY, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: NOTIFICATION_PREFS_KEY }),
  });
}

export function useActivity(enabled = true) {
  const focused = useIsFocused();
  return useQuery({
    queryKey: ACTIVITY_KEY,
    queryFn: fetchActivity,
    enabled,
    refetchInterval: focused ? ACTIVITY_REFETCH_MS : false,
    refetchOnWindowFocus: true,
    meta: PRIVATE,
  });
}

export const cityTimezoneKey = (citySlug: string) => ['cityTimezone', citySlug] as const;

export function useCityTimezone() {
  const citySlug = useCurrentCity();
  return useQuery({
    queryKey: cityTimezoneKey(citySlug),
    queryFn: () => fetchCityTimezone(citySlug),
    staleTime: ONE_HOUR_MS,
  });
}

// Bell dot: something happened on my posts or follows since the last time I opened "Novità".
export function useUnseenActivityCount(): number {
  const items = useActivity().data ?? [];
  const seenAt = useNotificationStore((state) => state.activitySeenAt);
  return unseenActivity(items, seenAt);
}

// Chat tab badge: rooms with something I have not read, judged by the local "last read" per room.
export function useUnreadChatCount(): number {
  const rooms = useMyChatRooms().data ?? [];
  const lastReadAt = useNotificationStore((state) => state.chatLastReadAt);
  const myHandle = useSession().profile?.handle ?? '';
  return unreadRooms(rooms, lastReadAt, myHandle);
}

// Called by the room screen: reading happens while it is open, also for messages arriving live.
// The server's clock decides when a message was written, so never mark "read" earlier than the newest one.
export function useMarkRoomRead(roomId: string, latestMessageAt: string | null): void {
  const markRoomRead = useNotificationStore((state) => state.markRoomRead);
  useEffect(() => {
    const now = new Date().toISOString();
    markRoomRead(roomId, latestMessageAt !== null && latestMessageAt > now ? latestMessageAt : now);
  }, [roomId, latestMessageAt, markRoomRead]);
}

// Increments each time the app returns to the foreground: reminders are re-planned then, because
// days have passed since the last plan and the horizon is only 7 days.
function useForegroundTick(): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status) => {
      if (status === 'active') setTick((value) => value + 1);
    });
    return () => subscription.remove();
  }, []);
  return tick;
}

// Keeps the phone's schedule in line with preferences, my declaration, the city's clock and posts already
// published. Runs at launch, when the app comes back, and whenever one of those changes.
export function useReminderSync(enabled: boolean): void {
  const { t, i18n } = useTranslation('notifications');
  const prefs = useNotificationPrefs().data;
  const declaration = useMyDeclaration();
  const timezone = useCityTimezone().data;
  const postedNights = useNotificationStore((state) => state.postedNights);
  const tick = useForegroundTick();
  const permissionVersion = usePrePermissionStore((state) => state.permissionVersion);
  const declarationLoaded = declaration.isSuccess;
  const expiresAt = declaration.data?.expiresAt ?? null;

  useEffect(() => {
    if (!enabled || !prefs || !declarationLoaded || timezone === undefined) return;
    void syncLocalReminders({
      prefs,
      timezone,
      now: new Date(),
      declaration: expiresAt === null ? null : { expiresAt },
      postedNights,
      translate: (key) => t(key),
    }).catch(() => console.warn('reminder sync failed'));
  }, [
    enabled,
    prefs,
    declarationLoaded,
    expiresAt,
    timezone,
    postedNights,
    tick,
    permissionVersion,
    t,
    i18n.language,
  ]);
}
