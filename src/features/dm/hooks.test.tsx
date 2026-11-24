import { act, renderHook, waitFor } from '@testing-library/react-native';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import type { DmMessage } from './domain/messages';
import { useDmMessages, useDmThreads, useDmUnreadCount, useSendDm } from './hooks';
import { DM_THREADS_KEY, DM_UNREAD_KEY, dmMessagesKey } from './keys';

jest.mock('expo-router', () => ({ useIsFocused: jest.fn(() => true) }));

const msg = (id: string, minute: number, extra: Record<string, unknown> = {}) => ({
  id,
  sender_is_me: false,
  sender_id: 'amico',
  text: id,
  created_at: `2026-11-24T20:${String(minute).padStart(2, '0')}:00Z`,
  ...extra,
});

describe('persistenza (principio 5)', () => {
  it('casella, messaggi e badge non vanno mai su disco', async () => {
    setFakeRpc({
      get_dm_threads: [],
      get_dm_messages: [msg('a', 1)],
      get_dm_unread_count: 2,
    });
    const { Wrapper, client } = createQueryWrapper();
    const { result } = await renderHook(
      () => ({
        threads: useDmThreads(),
        messages: useDmMessages('t1'),
        unread: useDmUnreadCount(),
      }),
      { wrapper: Wrapper },
    );
    await waitFor(() => expect(result.current.messages.messages).toHaveLength(1));
    await waitFor(() => expect(result.current.unread).toBe(2));
    for (const key of [DM_THREADS_KEY, dmMessagesKey('t1'), DM_UNREAD_KEY]) {
      expect(client.getQueryCache().find({ queryKey: key })?.meta).toEqual({ persist: false });
    }
  });
});

describe('useDmMessages', () => {
  it('carica dal più nuovo e con una pagina piena offre le più vecchie', async () => {
    const page = Array.from({ length: 50 }, (_, i) =>
      msg(`n${i}`, 0, { created_at: `2026-11-24T21:${String(59 - i).padStart(2, '0')}:00Z` }),
    );
    setFakeRpc({
      get_dm_messages: (args: unknown) =>
        (args as { p_before: string | null }).p_before === null
          ? page
          : [msg('old', 0, { created_at: '2026-11-24T10:00:00Z' })],
    });
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useDmMessages('t1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.messages).toHaveLength(50));
    expect(result.current.hasMore).toBe(true);
    await act(() => result.current.loadOlder());
    await waitFor(() => expect(result.current.messages).toHaveLength(51));
    expect(result.current.hasMore).toBe(false);
  });
});

describe('useSendDm', () => {
  it('invia, aggiunge il messaggio alla cache e rinfresca la casella', async () => {
    setFakeRpc({ send_dm: [{ id: 'm9', created_at: '2026-11-24T20:30:00Z' }] });
    const { Wrapper, client } = createQueryWrapper();
    client.setQueryData<DmMessage[]>(dmMessagesKey('t1'), []);
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useSendDm('t1', 'me'), { wrapper: Wrapper });
    await act(async () => {
      result.current.send('ciao');
    });
    await waitFor(() =>
      expect(client.getQueryData<DmMessage[]>(dmMessagesKey('t1'))).toEqual([
        {
          id: 'm9',
          senderId: 'me',
          isMine: true,
          text: 'ciao',
          createdAt: '2026-11-24T20:30:00Z',
        },
      ]),
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DM_THREADS_KEY });
  });

  it('espone NOT_LINKED quando il legame è caduto', async () => {
    fakeSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'NOT_LINKED' } });
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useSendDm('t1', 'me'), { wrapper: Wrapper });
    await act(async () => {
      result.current.send('ciao');
    });
    await waitFor(() => expect(result.current.error).toBe('NOT_LINKED'));
  });
});
