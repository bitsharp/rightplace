import { renderHook, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import type { ChatMessage } from './domain/messages';
import { roomMessagesKey } from './keys';
import { uploadPhoto } from '@/lib/photos/photos';
import { useSendMessage } from './useSendMessage';

jest.mock('@/lib/photos/photos', () => ({ uploadPhoto: jest.fn() }));

const me = { userId: 'me', handle: 'lince.rosso' };

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

// An RPC that stays pending until the test releases it: shows the state *during* the send.
function holdRpc(name: string, answer: unknown) {
  let release: (error?: unknown) => void = () => undefined;
  const gate = new Promise<{ data: unknown; error: unknown }>((resolve) => {
    release = (error) => resolve({ data: error ? null : answer, error: error ?? null });
  });
  fakeSupabase.rpc.mockImplementation(async (called: string) =>
    called === name ? gate : { data: null, error: null },
  );
  return release;
}

describe('useSendMessage', () => {
  async function setup() {
    const wrapper = createQueryWrapper();
    wrapper.client.setQueryData<ChatMessage[]>(roomMessagesKey('r1'), []);
    const view = await renderHook(() => useSendMessage('r1', me), { wrapper: wrapper.Wrapper });
    return { ...wrapper, ...view };
  }
  const cached = (client: ReturnType<typeof createQueryWrapper>['client']) =>
    client.getQueryData<ChatMessage[]>(roomMessagesKey('r1')) ?? [];

  it('mostra subito il messaggio come in invio e poi lo sostituisce con quello salvato', async () => {
    const release = holdRpc('send_chat_message', [
      { message_id: 'real-1', created_at: '2026-11-07T22:01:00Z' },
    ]);
    const { result, client } = await setup();
    result.current.send({ text: 'ciao' });
    await waitFor(() => expect(cached(client)).toHaveLength(1));
    expect(cached(client)[0]).toMatchObject({
      text: 'ciao',
      isMine: true,
      pending: true,
      handle: 'lince.rosso',
    });
    expect(Haptics.selectionAsync).toHaveBeenCalled();
    release();
    await waitFor(() => expect(cached(client)[0]?.id).toBe('real-1'));
    expect(cached(client)[0]).toMatchObject({ pending: false, createdAt: '2026-11-07T22:01:00Z' });
    expect(cached(client)).toHaveLength(1);
  });

  it("se l'invio fallisce il messaggio resta, segnato come non inviato", async () => {
    const release = holdRpc('send_chat_message', null);
    const { result, client } = await setup();
    result.current.send({ text: 'ciao' });
    await waitFor(() => expect(cached(client)).toHaveLength(1));
    release({ message: 'NOT_ROOM_MEMBER' });
    await waitFor(() => expect(cached(client)[0]).toMatchObject({ failed: true, pending: false }));
  });

  it('riprovare toglie il messaggio fallito e lo rimanda', async () => {
    const release = holdRpc('send_chat_message', null);
    const { result, client } = await setup();
    result.current.send({ text: 'ciao' });
    await waitFor(() => expect(cached(client)).toHaveLength(1));
    release({ message: 'NETWORK' });
    await waitFor(() => expect(cached(client)[0]?.failed).toBe(true));
    const failedId = cached(client)[0]?.id ?? '';
    setFakeRpc({
      send_chat_message: [{ message_id: 'real-2', created_at: '2026-11-07T22:02:00Z' }],
    });
    result.current.retry(failedId);
    await waitFor(() => expect(cached(client).map((m) => m.id)).toEqual(['real-2']));
  });

  it('una foto viene caricata e poi inviata con il path ottenuto', async () => {
    jest.mocked(uploadPhoto).mockResolvedValue('me/abc.jpg');
    setFakeRpc({
      send_chat_message: [{ message_id: 'real-3', created_at: '2026-11-07T22:03:00Z' }],
    });
    const { result, client } = await setup();
    result.current.send({ cleanUri: 'file:///clean.jpg' });
    await waitFor(() => expect(cached(client)[0]?.id).toBe('real-3'));
    expect(uploadPhoto).toHaveBeenCalledWith('chat-photos', 'me', 'file:///clean.jpg');
    expect(rpcCalls('send_chat_message')[0]?.[1]).toEqual({
      p_room_id: 'r1',
      p_text: null,
      p_photo_path: 'me/abc.jpg',
    });
    expect(cached(client)[0]).toMatchObject({ kind: 'photo', text: null });
  });

  it('se il caricamento della foto fallisce non invia nessun messaggio', async () => {
    jest.mocked(uploadPhoto).mockRejectedValue(new Error('upload'));
    const { result, client } = await setup();
    result.current.send({ cleanUri: 'file:///clean.jpg' });
    await waitFor(() => expect(cached(client)[0]?.failed).toBe(true));
    expect(rpcCalls('send_chat_message')).toHaveLength(0);
  });
});
