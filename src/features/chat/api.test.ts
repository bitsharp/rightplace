import { RpcError } from '@/lib/rpcError';
import { fakeSupabase } from '@/test/fakeSupabase';

import {
  fetchMyChatRooms,
  fetchPhotoUrls,
  fetchRoomMessages,
  reportMessage,
  sendChatMessage,
} from './api';

const respondWith = (data: unknown, error: unknown = null) =>
  fakeSupabase.rpc.mockResolvedValueOnce({ data, error });

const roomRow = (overrides: Record<string, unknown> = {}) => ({
  room_id: 'r1',
  venue_id: 'v1',
  venue_name: 'Arena Club',
  event_id: null,
  event_name: null,
  expires_at: '2026-11-09T04:00:00Z',
  friends_inside: 2,
  photo_count: 1,
  last_kind: 'text',
  last_text: 'ci vediamo alle 11',
  last_handle: 'volpe.viola',
  last_at: '2026-11-07T22:00:00Z',
  ...overrides,
});

const messageRow = (overrides: Record<string, unknown> = {}) => ({
  message_id: 'm1',
  user_id: 'u1',
  handle: 'volpe.viola',
  kind: 'text',
  text: 'ciao',
  created_at: '2026-11-07T22:00:00Z',
  is_mine: false,
  ...overrides,
});

describe('fetchMyChatRooms', () => {
  it('chiama get_my_chat_rooms e converte le righe', async () => {
    respondWith([roomRow()]);
    await expect(fetchMyChatRooms()).resolves.toEqual([
      {
        roomId: 'r1',
        venueId: 'v1',
        venueName: 'Arena Club',
        eventId: null,
        eventName: null,
        expiresAt: '2026-11-09T04:00:00Z',
        friendsInside: 2,
        photoCount: 1,
        lastKind: 'text',
        lastText: 'ci vediamo alle 11',
        lastHandle: 'volpe.viola',
        lastAt: '2026-11-07T22:00:00Z',
      },
    ]);
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_my_chat_rooms', undefined);
  });

  it('accetta una stanza ancora senza messaggi visibili', async () => {
    respondWith([roomRow({ last_kind: null, last_text: null, last_handle: null, last_at: null })]);
    const [room] = await fetchMyChatRooms();
    expect(room).toMatchObject({ lastKind: null, lastText: null, lastHandle: null, lastAt: null });
  });

  it('rifiuta una risposta con forma inattesa', async () => {
    respondWith([{ room_id: 'r1' }]);
    await expect(fetchMyChatRooms()).rejects.toThrow();
  });
});

describe('fetchRoomMessages', () => {
  it('chiama get_room_messages e converte i messaggi', async () => {
    respondWith([messageRow({ is_mine: true })]);
    await expect(fetchRoomMessages('r1')).resolves.toEqual([
      {
        id: 'm1',
        userId: 'u1',
        handle: 'volpe.viola',
        kind: 'text',
        text: 'ciao',
        createdAt: '2026-11-07T22:00:00Z',
        isMine: true,
      },
    ]);
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_room_messages', {
      p_room_id: 'r1',
      p_before: null,
      p_limit: 50,
    });
  });

  it('per le pagine più vecchie passa p_before', async () => {
    respondWith([]);
    await fetchRoomMessages('r1', '2026-11-07T22:00:00Z');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_room_messages', {
      p_room_id: 'r1',
      p_before: '2026-11-07T22:00:00Z',
      p_limit: 50,
    });
  });

  it('propaga NOT_ROOM_MEMBER come errore tipizzato', async () => {
    respondWith(null, { message: 'NOT_ROOM_MEMBER' });
    await expect(fetchRoomMessages('r1')).rejects.toEqual(new RpcError('NOT_ROOM_MEMBER'));
  });
});

describe('sendChatMessage', () => {
  it('invia un testo', async () => {
    respondWith([{ message_id: 'm9', created_at: '2026-11-07T22:01:00Z' }]);
    await expect(sendChatMessage('r1', { text: 'ciao' })).resolves.toEqual({
      messageId: 'm9',
      createdAt: '2026-11-07T22:01:00Z',
    });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('send_chat_message', {
      p_room_id: 'r1',
      p_text: 'ciao',
      p_photo_path: null,
    });
  });

  it('invia una foto con il path caricato', async () => {
    respondWith([{ message_id: 'm9', created_at: '2026-11-07T22:01:00Z' }]);
    await sendChatMessage('r1', { photoPath: 'u1/abc.jpg' });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('send_chat_message', {
      p_room_id: 'r1',
      p_text: null,
      p_photo_path: 'u1/abc.jpg',
    });
  });

  it.each(['NOT_ROOM_MEMBER', 'INVALID_PHOTO_PATH', 'INVALID_MESSAGE'] as const)(
    'propaga %s come errore tipizzato',
    async (code) => {
      respondWith(null, { message: code });
      await expect(sendChatMessage('r1', { text: 'x' })).rejects.toEqual(new RpcError(code));
    },
  );
});

describe('fetchPhotoUrls', () => {
  it('chiama la Edge Function e restituisce gli URL per id messaggio', async () => {
    fakeSupabase.functions.invoke.mockResolvedValueOnce({
      data: { urls: [{ messageId: 'm1', url: 'https://signed.test/a' }] },
      error: null,
    });
    await expect(fetchPhotoUrls(['m1', 'm2'])).resolves.toEqual({ m1: 'https://signed.test/a' });
    expect(fakeSupabase.functions.invoke).toHaveBeenCalledWith('chat-photo-urls', {
      body: { messageIds: ['m1', 'm2'] },
    });
  });

  it('senza id non chiama la rete', async () => {
    await expect(fetchPhotoUrls([])).resolves.toEqual({});
    expect(fakeSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('un errore della funzione diventa UNKNOWN, senza dettagli', async () => {
    fakeSupabase.functions.invoke.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    await expect(fetchPhotoUrls(['m1'])).rejects.toEqual(new RpcError('UNKNOWN'));
  });
});

describe('reportMessage', () => {
  it('segnala il messaggio con target_kind message', async () => {
    respondWith(null);
    await reportMessage('m1');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('report', {
      p_target_kind: 'message',
      p_target_id: 'm1',
      p_reason: null,
    });
  });
});
