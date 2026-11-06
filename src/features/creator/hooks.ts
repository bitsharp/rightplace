import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';

import { CHAT_ROOMS_KEY } from '@/features/chat/keys';
import { MY_DECLARATION_KEY } from '@/features/map/hooks';
import { POST_TARGET_KEY } from '@/features/posts/keys';

import {
  cancelEvent,
  createEvent,
  fetchEventAttendance,
  fetchMyEvents,
  updateEvent,
  type EventScope,
} from './api';
import type { EventInput } from './domain/eventForm';

// Sign-ups are bands about other people: in memory only, never on disk.
const PRIVATE = { persist: false } as const;

export function useMyEvents(scope: EventScope, enabled = true) {
  return useQuery({
    queryKey: ['myEvents', scope],
    queryFn: () => fetchMyEvents(scope),
    enabled,
    meta: PRIVATE,
  });
}

export function useEventAttendance(eventId: string, enabled = true) {
  return useQuery({
    queryKey: ['eventAttendance', eventId],
    queryFn: () => fetchEventAttendance(eventId),
    enabled,
    meta: PRIVATE,
  });
}

// Every place that lists or counts events: the creator's lists, the public detail, search and map.
function invalidateEvents(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['myEvents'] }),
    queryClient.invalidateQueries({ queryKey: ['eventAttendance'] }),
    queryClient.invalidateQueries({ queryKey: ['eventDetail'] }),
    queryClient.invalidateQueries({ queryKey: ['cityEvents'] }),
  ]);
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EventInput) => createEvent(input),
    onSuccess: () => invalidateEvents(queryClient),
  });
}

export function useUpdateEvent(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: EventInput) => updateEvent(eventId, input),
    onSuccess: () => invalidateEvents(queryClient),
  });
}

// Cancelling expires the declarations and the chat of the event: whatever showed them reloads too.
export function useCancelEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => cancelEvent(eventId),
    onSuccess: () =>
      Promise.all([
        invalidateEvents(queryClient),
        queryClient.invalidateQueries({ queryKey: MY_DECLARATION_KEY }),
        queryClient.invalidateQueries({ queryKey: ['cityMap'] }),
        queryClient.invalidateQueries({ queryKey: CHAT_ROOMS_KEY }),
        queryClient.invalidateQueries({ queryKey: POST_TARGET_KEY }),
      ]),
  });
}
