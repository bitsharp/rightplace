import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { startRoomConnection } from '@/features/chat/roomConnection';

import { appendDm, type DmMessage } from './domain/messages';
import { DM_THREADS_KEY, DM_UNREAD_KEY, dmMessagesKey } from './keys';
import { parseInsertedDm } from './realtime';

// Keeps the cached messages of an open conversation live. New rows are appended only to a list that was already
// loaded: creating a partial cache would make the first real fetch look unnecessary.
export function useDmRealtime(threadId: string, meId: string) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const key = dmMessagesKey(threadId);
    const connection = startRoomConnection({
      roomId: threadId,
      source: { table: 'dm_messages', column: 'thread_id', channel: `dm:${threadId}` },
      onInsert: (row) => {
        const message = parseInsertedDm(row, threadId, meId);
        if (!message) return;
        queryClient.setQueryData<DmMessage[]>(key, (list) =>
          list ? appendDm(list, message) : list,
        );
        void queryClient.invalidateQueries({ queryKey: DM_THREADS_KEY });
        void queryClient.invalidateQueries({ queryKey: DM_UNREAD_KEY });
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
  }, [threadId, meId, queryClient]);
}
