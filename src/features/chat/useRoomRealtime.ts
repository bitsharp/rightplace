import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

import { appendMessage, type ChatMessage } from './domain/messages';
import { roomMessagesKey } from './keys';
import { parseInsertedMessage, type RealtimePerson } from './realtime';
import { startRoomConnection } from './roomConnection';

// Keeps the cached messages of an open chat live. New rows are appended only to a list that was already
// loaded: creating a partial cache would make the first real fetch look unnecessary.
export function useRoomRealtime(roomId: string, me: RealtimePerson, following: RealtimePerson[]) {
  const queryClient = useQueryClient();
  const latest = useRef({ me, following });
  useEffect(() => {
    latest.current = { me, following };
  }, [me, following]);

  useEffect(() => {
    const key = roomMessagesKey(roomId);
    const connection = startRoomConnection({
      roomId,
      onInsert: (row) => {
        const message = parseInsertedMessage(
          row,
          roomId,
          latest.current.me,
          latest.current.following,
        );
        if (!message) return;
        queryClient.setQueryData<ChatMessage[]>(key, (list) =>
          list ? appendMessage(list, message) : list,
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
