import { act, renderHook, waitFor } from '@testing-library/react-native';
import { useIsFocused } from 'expo-router';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import type { ChatMessage } from './domain/messages';
import {
  useBlockChatUser,
  useMyChatRooms,
  usePhotoUrls,
  useReportChatMessage,
  useRoomMessages,
} from './hooks';
import { CHAT_ROOMS_KEY, roomMessagesKey } from './keys';

jest.mock('expo-router', () => ({ useIsFocused: jest.fn(() => true) }));

const row = (id: string, minute: number, overrides: Record<string, unknown> = {}) => ({
  message_id: id,
  user_id: 'amico',
  handle: 'volpe.viola',
  kind: 'text',
  text: id,
  created_at: `2026-11-07T22:${String(minute).padStart(2, '0')}:00Z`,
  is_mine: false,
  ...overrides,
});

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

describe('useMyChatRooms', () => {
  it('carica le stanze e non le salva su disco (principio 5)', async () => {
    setFakeRpc({
      get_my_chat_rooms: [
        {
          room_id: 'r1',
          venue_id: 'v1',
          venue_name: 'Arena Club',
          event_id: null,
          event_name: null,
          expires_at: '2026-11-09T04:00:00Z',
          friends_inside: 1,
          photo_count: 0,
          last_kind: null,
          last_text: null,
          last_handle: null,
          last_at: null,
        },
      ],
    });
    const { Wrapper, client } = createQueryWrapper();
    const { result } = await renderHook(() => useMyChatRooms(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.data).toHaveLength(1));
    expect(client.getQueryCache().find({ queryKey: CHAT_ROOMS_KEY })?.meta).toEqual({
      persist: false,
    });
    expect(useIsFocused).toHaveBeenCalled();
  });
});

describe('useRoomMessages', () => {
  // 50 messages, newest first (23:59 down to 23:10): exactly one full page.
  const fullPage = () =>
    Array.from({ length: 50 }, (_, i) =>
      row(`n${i}`, 59 - i, { created_at: `2026-11-07T23:${59 - i}:00Z` }),
    );

  it('carica la prima pagina, dal più nuovo, senza persisterla', async () => {
    setFakeRpc({ get_room_messages: [row('b', 5), row('a', 1)] });
    const { Wrapper, client } = createQueryWrapper();
    const { result } = await renderHook(() => useRoomMessages('r1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.messages.map((m) => m.id)).toEqual(['b', 'a']));
    expect(client.getQueryCache().find({ queryKey: roomMessagesKey('r1') })?.meta).toEqual({
      persist: false,
    });
    expect(result.current.hasMore).toBe(false);
  });

  it('con una pagina piena offre le più vecchie e le unisce senza duplicati', async () => {
    const page = fullPage();
    setFakeRpc({
      get_room_messages: (args: unknown) =>
        (args as { p_before: string | null }).p_before === null
          ? page
          : [row('old1', 10, { created_at: '2026-11-07T20:00:00Z' }), page[49]],
    });
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useRoomMessages('r1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.messages).toHaveLength(50));
    expect(result.current.hasMore).toBe(true);
    await act(() => result.current.loadOlder());
    await waitFor(() => expect(result.current.messages).toHaveLength(51));
    expect(rpcCalls('get_room_messages')[1]?.[1]).toMatchObject({ p_before: page[49]?.created_at });
    expect(result.current.messages.at(-1)?.id).toBe('old1');
    expect(result.current.hasMore).toBe(false);
  });

  it('un nuovo caricamento non butta via i messaggi più vecchi già letti né quelli in invio', async () => {
    const page = fullPage();
    setFakeRpc({ get_room_messages: page });
    const { Wrapper, client } = createQueryWrapper();
    const key = roomMessagesKey('r1');
    const { result } = await renderHook(() => useRoomMessages('r1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.messages).toHaveLength(50));
    const older: ChatMessage = {
      id: 'old',
      userId: 'amico',
      handle: 'volpe.viola',
      kind: 'text',
      text: 'old',
      createdAt: '2026-11-07T20:00:00Z',
      isMine: false,
    };
    const pending: ChatMessage = {
      ...older,
      id: 'tmp-1',
      createdAt: '2026-11-08T00:30:00Z',
      isMine: true,
      pending: true,
    };
    client.setQueryData<ChatMessage[]>(key, (list) => [pending, ...(list ?? []), older]);
    await client.invalidateQueries({ queryKey: key });
    await waitFor(() => {
      const ids = result.current.messages.map((m) => m.id);
      expect(ids[0]).toBe('tmp-1');
      expect(ids.at(-1)).toBe('old');
      expect(ids).toHaveLength(52);
    });
  });
});

describe('usePhotoUrls', () => {
  it('chiede gli URL firmati e li espone per id messaggio', async () => {
    fakeSupabase.functions.invoke.mockResolvedValue({
      data: { urls: [{ messageId: 'm1', url: 'https://signed.test/a' }] },
      error: null,
    });
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => usePhotoUrls('r1', ['m1']), { wrapper: Wrapper });
    await waitFor(() => expect(result.current).toEqual({ m1: 'https://signed.test/a' }));
  });

  it('senza foto non chiama la funzione', async () => {
    const { Wrapper } = createQueryWrapper();
    await renderHook(() => usePhotoUrls('r1', []), { wrapper: Wrapper });
    expect(fakeSupabase.functions.invoke).not.toHaveBeenCalled();
  });
});

describe('moderazione', () => {
  it('segnalare un messaggio chiama report con message', async () => {
    setFakeRpc({ report: null });
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useReportChatMessage(), { wrapper: Wrapper });
    result.current.mutate('m1');
    await waitFor(() => expect(rpcCalls('report')).toHaveLength(1));
    expect(rpcCalls('report')[0]?.[1]).toMatchObject({
      p_target_kind: 'message',
      p_target_id: 'm1',
    });
  });

  it('bloccare un utente svuota subito i messaggi in cache e ricarica stanze e lista', async () => {
    setFakeRpc({ block_user: null, get_my_chat_rooms: [] });
    const { Wrapper, client } = createQueryWrapper();
    client.setQueryData(roomMessagesKey('r1'), [{ id: 'x' }]);
    const { result } = await renderHook(() => useBlockChatUser(), { wrapper: Wrapper });
    result.current.mutate('amico');
    await waitFor(() => expect(client.getQueryData(roomMessagesKey('r1'))).toBeUndefined());
    expect(rpcCalls('block_user')[0]?.[1]).toEqual({ p_user_id: 'amico' });
  });
});
