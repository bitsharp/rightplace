import { renderHook } from '@testing-library/react-native';
import { AppState, type AppStateStatus } from 'react-native';

import { fakeChannels, fakeSupabase } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import type { ChatMessage } from './domain/messages';
import { roomMessagesKey } from './keys';
import { useRoomRealtime } from './useRoomRealtime';

const me = { userId: 'me', handle: 'lince.rosso' };
const following = [{ userId: 'amico', handle: 'volpe.viola' }];

const insertRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'm1',
  room_id: 'r1',
  user_id: 'amico',
  kind: 'text',
  text: 'ciao',
  photo_path: null,
  created_at: '2026-11-07T22:00:00Z',
  ...overrides,
});

let appStateHandler: (state: AppStateStatus) => void = () => undefined;
const removeAppListener = jest.fn();

beforeEach(() => {
  jest.spyOn(AppState, 'addEventListener').mockImplementation((_type, handler) => {
    appStateHandler = handler;
    return { remove: removeAppListener };
  });
});
afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

async function setup() {
  const wrapper = createQueryWrapper();
  wrapper.client.setQueryData<ChatMessage[]>(roomMessagesKey('r1'), []);
  const view = await renderHook(() => useRoomRealtime('r1', me, following), {
    wrapper: wrapper.Wrapper,
  });
  return { ...wrapper, ...view };
}

const cached = (client: ReturnType<typeof createQueryWrapper>['client']) =>
  client.getQueryData<ChatMessage[]>(roomMessagesKey('r1')) ?? [];

describe('useRoomRealtime', () => {
  it('si iscrive agli INSERT di chat_messages filtrati per stanza', async () => {
    await setup();
    expect(fakeSupabase.channel).toHaveBeenCalledWith('room:r1');
    expect(fakeChannels[0]?.filters).toEqual([
      { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: 'room_id=eq.r1' },
    ]);
  });

  it('appende nella cache il messaggio di un seguito', async () => {
    const { client } = await setup();
    fakeChannels[0]?.emitInsert(insertRow());
    expect(cached(client).map((m) => m.id)).toEqual(['m1']);
    expect(cached(client)[0]).toMatchObject({ handle: 'volpe.viola', isMine: false });
  });

  it('ignora il messaggio di chi non seguo', async () => {
    const { client } = await setup();
    fakeChannels[0]?.emitInsert(insertRow({ user_id: 'sconosciuto' }));
    expect(cached(client)).toEqual([]);
  });

  it('lo stesso id consegnato due volte resta una sola riga', async () => {
    const { client } = await setup();
    fakeChannels[0]?.emitInsert(insertRow());
    fakeChannels[0]?.emitInsert(insertRow());
    expect(cached(client)).toHaveLength(1);
  });

  it('se la lista non è ancora stata caricata non crea una cache parziale', async () => {
    const wrapper = createQueryWrapper();
    await renderHook(() => useRoomRealtime('r1', me, following), { wrapper: wrapper.Wrapper });
    fakeChannels[0]?.emitInsert(insertRow());
    expect(wrapper.client.getQueryData(roomMessagesKey('r1'))).toBeUndefined();
  });

  it("quando l'app torna attiva si riconnette e ricarica i messaggi persi", async () => {
    const { client } = await setup();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    appStateHandler('active');
    expect(fakeSupabase.removeChannel).toHaveBeenCalledWith(fakeChannels[0]);
    expect(fakeChannels).toHaveLength(2);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: roomMessagesKey('r1') });
  });

  it('in background non fa nulla', async () => {
    await setup();
    appStateHandler('background');
    expect(fakeChannels).toHaveLength(1);
  });

  it('dopo un errore del canale riprova con backoff 1 s, poi 2 s', async () => {
    await setup();
    jest.useFakeTimers();
    fakeChannels[0]?.emitStatus('CHANNEL_ERROR');
    expect(fakeChannels).toHaveLength(1);
    jest.advanceTimersByTime(1000);
    expect(fakeChannels).toHaveLength(2);
    fakeChannels[1]?.emitStatus('TIMED_OUT');
    jest.advanceTimersByTime(1999);
    expect(fakeChannels).toHaveLength(2);
    jest.advanceTimersByTime(1);
    expect(fakeChannels).toHaveLength(3);
  });

  it('ricollegato con successo ricarica i messaggi e riparte dal backoff iniziale', async () => {
    const { client } = await setup();
    jest.useFakeTimers();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    fakeChannels[0]?.emitStatus('CHANNEL_ERROR');
    jest.advanceTimersByTime(1000);
    fakeChannels[1]?.emitStatus('SUBSCRIBED');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: roomMessagesKey('r1') });
    fakeChannels[1]?.emitStatus('CLOSED');
    jest.advanceTimersByTime(1000);
    expect(fakeChannels).toHaveLength(3);
  });

  it('alla chiusura causata dal cleanup non si riconnette e rimuove il canale', async () => {
    const { unmount } = await setup();
    jest.useFakeTimers();
    const channel = fakeChannels[0];
    await unmount();
    expect(fakeSupabase.removeChannel).toHaveBeenCalledWith(channel);
    expect(removeAppListener).toHaveBeenCalled();
    channel?.emitStatus('CLOSED');
    jest.advanceTimersByTime(60_000);
    expect(fakeChannels).toHaveLength(1);
  });
});
