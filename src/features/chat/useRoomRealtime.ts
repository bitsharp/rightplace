import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { appendMessage, type ChatMessage } from './domain/messages';
import { roomMessagesKey } from './keys';
import { parseInsertedMessage, type RealtimePerson } from './realtime';
import { startRoomConnection } from './roomConnection';

// Authors whose handle the loaded messages already carry (the server only returned people I may see).
const authorsIn = (list: ChatMessage[] | undefined): RealtimePerson[] =>
  (list ?? []).map(({ userId, handle }) => ({ userId, handle }));

// Keeps the cached messages of an open chat live. New rows are appended only to a list that was already
// loaded: creating a partial cache would make the first real fetch look unnecessary.
export function useRoomRealtime(roomId: string, me: RealtimePerson) {
  const queryClient = useQueryClient();
  const latestMe = useRef(me);
  useEffect(() => {
    latestMe.current = me;
  }, [me]);

  useEffect(() => {
    const key = roomMessagesKey(roomId);
    const connection = startRoomConnection({
      roomId,
      onInsert: (row) => {
        const cache = queryClient.getQueryData<ChatMessage[]>(key);
        const outcome = parseInsertedMessage(row, roomId, latestMe.current, authorsIn(cache));
        if (outcome.type === 'refetch') void queryClient.invalidateQueries({ queryKey: key });
        if (outcome.type !== 'append') return;
        queryClient.setQueryData<ChatMessage[]>(key, (list) =>
          list ? appendMessage(list, outcome.message) : list,
        );
      },
      onRecovered: () => void queryClient.invalidateQueries({ queryKey: key }),
    });
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') connection.reconnectNow();
    });
    return () => {
      appState.remove();
      connection.stop();
    };
  }, [roomId, queryClient]);
}
