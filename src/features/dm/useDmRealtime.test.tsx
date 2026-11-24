import { renderHook } from '@testing-library/react-native';
import { AppState } from 'react-native';

import { fakeChannels, fakeSupabase } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import type { DmMessage } from './domain/messages';
import { DM_THREADS_KEY, DM_UNREAD_KEY, dmMessagesKey } from './keys';
import { useDmRealtime } from './useDmRealtime';

const known: DmMessage = {
  id: 'old',
  senderId: 'amico',
  isMine: false,
  text: 'prima',
  createdAt: '2026-11-24T19:00:00Z',
};
const insert = {
  id: 'm1',
  thread_id: 't1',
  sender_id: 'amico',
  text: 'ciao',
  created_at: '2026-11-24T20:00:00Z',
};

beforeEach(() => {
  jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() });
});
afterEach(() => jest.restoreAllMocks());

async function setup() {
  const wrapper = createQueryWrapper();
  wrapper.client.setQueryData<DmMessage[]>(dmMessagesKey('t1'), [known]);
  const view = await renderHook(() => useDmRealtime('t1', 'me'), { wrapper: wrapper.Wrapper });
  return { ...wrapper, ...view };
}

describe('useDmRealtime', () => {
  it('si iscrive agli INSERT di dm_messages filtrati per thread', async () => {
    await setup();
    expect(fakeSupabase.channel).toHaveBeenCalledWith('dm:t1');
    expect(fakeChannels[0]?.filters).toEqual([
      { event: 'INSERT', schema: 'public', table: 'dm_messages', filter: 'thread_id=eq.t1' },
    ]);
  });

  it('un nuovo messaggio entra in cache e invalida casella e badge', async () => {
    const { client } = await setup();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    fakeChannels[0]?.emitInsert(insert);
    const cached = client.getQueryData<DmMessage[]>(dmMessagesKey('t1')) ?? [];
    expect(cached.map((m) => m.id)).toEqual(['m1', 'old']);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DM_THREADS_KEY });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: DM_UNREAD_KEY });
  });

  it('non crea una cache parziale se i messaggi non sono ancora stati caricati', async () => {
    const wrapper = createQueryWrapper();
    await renderHook(() => useDmRealtime('t1', 'me'), { wrapper: wrapper.Wrapper });
    fakeChannels[0]?.emitInsert(insert);
    expect(wrapper.client.getQueryData(dmMessagesKey('t1'))).toBeUndefined();
  });

  it('chiude il canale quando la schermata si smonta', async () => {
    const { unmount } = await setup();
    await unmount();
    expect(fakeSupabase.removeChannel).toHaveBeenCalled();
  });
});
