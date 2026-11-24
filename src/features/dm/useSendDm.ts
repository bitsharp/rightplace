import { useMutation, useQueryClient } from '@tanstack/react-query';

import { selectionFeedback } from '@/lib/haptics';

import { dmErrorOf, sendDm, type DmError } from './api';
import { appendDm, type DmMessage } from './domain/messages';
import { DM_THREADS_KEY, dmMessagesKey } from './keys';

// Text only: the bubble appears once the server confirmed it, so what is on screen is always what was stored
// (a closed friendship answers NOT_LINKED and the composer says so, instead of showing a message nobody gets).
export function useSendDm(threadId: string, meId: string) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (text: string) => sendDm(threadId, text),
    onSuccess: (saved, text) => {
      selectionFeedback();
      const message: DmMessage = {
        id: saved.id,
        senderId: meId,
        isMine: true,
        text,
        createdAt: saved.createdAt,
      };
      queryClient.setQueryData<DmMessage[]>(dmMessagesKey(threadId), (list) =>
        appendDm(list ?? [], message),
      );
      void queryClient.invalidateQueries({ queryKey: DM_THREADS_KEY });
    },
  });
  const error: DmError | null = mutation.isError ? dmErrorOf(mutation.error) : null;
  return { send: mutation.mutate, isSending: mutation.isPending, error, reset: mutation.reset };
}
