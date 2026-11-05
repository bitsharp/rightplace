import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { useIsFocused } from 'expo-router';

import type { MyDeclaration } from '@/features/map/api';
import { MY_DECLARATION_KEY } from '@/features/map/hooks';
import type { Intent } from '@/features/nights/domain/band';
import { confirmFeedback } from '@/lib/haptics';
import { RpcError } from '@/lib/rpcError';

import { declare, fetchVenueDetail, fetchVenueStats, undeclare } from './api';
import type { DeclarationTarget } from './domain/declarationState';
import type { StatsSegment } from './domain/statsState';

const ONE_HOUR_MS = 60 * 60 * 1000;
export const VENUE_STATS_REFETCH_MS = 60 * 1000;
// Stand-in until the refetch brings the real `expires_at`; the sheet closes before it is shown.
const OPTIMISTIC_TTL_MS = 6 * ONE_HOUR_MS;

// A venue that does not exist (or is switched off) will not appear by retrying.
const retryUnlessMissing = (failures: number, error: unknown) =>
  !(error instanceof RpcError && error.code === 'NOT_FOUND') && failures < 3;

// The catalog changes rarely: cached (and persisted) for an hour.
export function useVenueDetail(venueId: string) {
  return useQuery({
    queryKey: ['venueDetail', venueId],
    queryFn: () => fetchVenueDetail(venueId),
    staleTime: ONE_HOUR_MS,
    retry: retryUnlessMissing,
  });
}

// Tonight's numbers move all evening: polled while in front, never written to disk.
export function useVenueStats(venueId: string, segment: StatsSegment) {
  const focused = useIsFocused();
  return useQuery({
    queryKey: ['venueStats', venueId, segment],
    queryFn: () => fetchVenueStats(venueId, segment),
    refetchInterval: focused ? VENUE_STATS_REFETCH_MS : false,
    refetchOnWindowFocus: true,
    // Switching segment keeps the bands on screen; callers check isPlaceholderData for the rest.
    placeholderData: keepPreviousData,
    meta: { persist: false },
  });
}

type DeclareVariables = {
  target: DeclarationTarget;
  intent: Intent;
  venue: { id: string; name: string };
};

type Snapshot = { previous: MyDeclaration | null | undefined };

async function swapMyDeclaration(
  queryClient: QueryClient,
  next: MyDeclaration | null,
): Promise<Snapshot> {
  await queryClient.cancelQueries({ queryKey: MY_DECLARATION_KEY });
  const previous = queryClient.getQueryData<MyDeclaration | null>(MY_DECLARATION_KEY);
  queryClient.setQueryData(MY_DECLARATION_KEY, next);
  return { previous };
}

function restoreMyDeclaration(queryClient: QueryClient, snapshot: Snapshot | undefined): void {
  if (snapshot) queryClient.setQueryData(MY_DECLARATION_KEY, snapshot.previous);
}

// Everything a declaration changes: the pill, the map layers, the venue numbers, the stories bar.
function invalidateAfterChange(queryClient: QueryClient, venueId?: string): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: MY_DECLARATION_KEY }),
    queryClient.invalidateQueries({ queryKey: ['cityMap'] }),
    queryClient.invalidateQueries({ queryKey: venueId ? ['venueStats', venueId] : ['venueStats'] }),
    queryClient.invalidateQueries({ queryKey: ['stories'] }),
  ]);
}

function optimisticDeclaration({ target, intent, venue }: DeclareVariables): MyDeclaration {
  return {
    venueId: venue.id,
    venueName: venue.name,
    eventId: target.kind === 'event' ? target.id : null,
    intent,
    expiresAt: new Date(Date.now() + OPTIMISTIC_TTL_MS).toISOString(),
  };
}

export function useDeclare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ target, intent }: DeclareVariables) => declare(target, intent),
    onMutate: (variables) => {
      confirmFeedback();
      return swapMyDeclaration(queryClient, optimisticDeclaration(variables));
    },
    onError: (_error, _variables, snapshot) => restoreMyDeclaration(queryClient, snapshot),
    onSettled: (_data, _error, variables) => invalidateAfterChange(queryClient, variables.venue.id),
  });
}

export function useUndeclare() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: undeclare,
    onMutate: () => swapMyDeclaration(queryClient, null),
    onError: (_error, _variables, snapshot) => restoreMyDeclaration(queryClient, snapshot),
    onSettled: () => invalidateAfterChange(queryClient),
  });
}
