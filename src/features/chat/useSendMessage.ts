import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { selectionFeedback } from '@/lib/haptics';

import { sendChatMessage } from './api';
import {
  appendMessage,
  confirmSent,
  markFailed,
  removeMessage,
  type ChatMessage,
} from './domain/messages';
import { roomMessagesKey } from './keys';
import { uploadChatPhoto } from './photos';
import type { RealtimePerson } from './realtime';

// `cleanUri` is the output of preparePhoto (EXIF-free JPEG, <= 1280 px), never the original picture.
export type SendInput = { text: string } | { cleanUri: string };
type Variables = { tempId: string; input: SendInput };

function temporaryMessage({ tempId, input }: Variables, me: RealtimePerson): ChatMessage {
  return {
    id: tempId,
    userId: me.userId,
    handle: me.handle,
    kind: 'text' in input ? 'text' : 'photo',
    text: 'text' in input ? input.text : null,
    createdAt: new Date().toISOString(),
    isMine: true,
    pending: true,
  };
}

// Optimistic send: the bubble appears at once as "sending", becomes the saved message on success,
// and stays visible as "not sent" (with retry) on failure.
export function useSendMessage(roomId: string, me: RealtimePerson) {
  const queryClient = useQueryClient();
  const key = roomMessagesKey(roomId);
  const counter = useRef(0);
  const inputs = useRef(new Map<string, SendInput>());
  const update = (change: (list: ChatMessage[]) => ChatMessage[]) =>
    queryClient.setQueryData<ChatMessage[]>(key, (list) => change(list ?? []));

  const mutation = useMutation({
    mutationFn: async ({ input }: Variables) => {
      if ('text' in input) return sendChatMessage(roomId, { text: input.text });
      return sendChatMessage(roomId, {
        photoPath: await uploadChatPhoto(me.userId, input.cleanUri),
      });
    },
    onMutate: async (variables) => {
      selectionFeedback();
      await queryClient.cancelQueries({ queryKey: key });
      update((list) => appendMessage(list, temporaryMessage(variables, me)));
    },
    onSuccess: (saved, { tempId }) => {
      inputs.current.delete(tempId);
      update((list) => confirmSent(list, tempId, saved));
    },
    onError: (_error, { tempId }) => update((list) => markFailed(list, tempId)),
  });

  const send = (input: SendInput) => {
    counter.current += 1;
    const tempId = `tmp-${counter.current}`;
    inputs.current.set(tempId, input);
    mutation.mutate({ tempId, input });
  };

  const retry = (failedId: string) => {
    const input = inputs.current.get(failedId);
    if (!input) return;
    inputs.current.delete(failedId);
    update((list) => removeMessage(list, failedId));
    send(input);
  };

  return { send, retry, isSending: mutation.isPending };
}
