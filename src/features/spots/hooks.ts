import { useMutation, useQueryClient } from '@tanstack/react-query';

import { invalidateAfterChange } from '@/features/venue/hooks';
import { requestPrePermission } from '@/features/notifications/prePermission';
import { confirmFeedback } from '@/lib/haptics';

import { declareAtSpot, reportSpot } from './api';

// A new spot changes what a declaration changes everywhere: pill, map, numbers, chat rooms, stories.
export function useDeclareAtSpot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: declareAtSpot,
    onMutate: () => confirmFeedback(),
    onSuccess: () => requestPrePermission(),
    onSettled: () => invalidateAfterChange(queryClient),
  });
}

export function useReportSpot() {
  return useMutation({ mutationFn: reportSpot });
}
