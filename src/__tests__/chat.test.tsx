import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { seedChatBackend, type FakeMessage } from '@/test/chatBackend';
import { renderApp } from '@/test/appFlows';
import { fakeStorageUpload, fakeSupabase } from '@/test/fakeSupabase';
import type { FakeUser } from '@/test/friendsBackend';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));

jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }));
// The native manipulator is the boundary: it hands back the path of the re-encoded JPEG.
jest.mock('expo-image-manipulator', () => {
  const image = { width: 1280, height: 960, saveAsync: async () => ({ uri: 'file:///clean.jpg' }) };
  const context = { resize: jest.fn(), renderAsync: async () => image };
  context.resize.mockReturnValue(context);
  return { ImageManipulator: { manipulate: () => context }, SaveFormat: { JPEG: 'jpeg' } };
});

const VOLPE: FakeUser = { id: 'u-volpe', handle: 'volpe.viola' };
const GATTO: FakeUser = { id: 'u-gatto', handle: 'gatto.blu' };
const ORSO: FakeUser = { id: 'u-orso', handle: 'orso.verde' };
const ARENA = { room_id: 'r1', venue_id: 'arena', venue_name: 'Arena Club' };

const message = (id: string, user: FakeUser, text: string, minute: number): FakeMessage => ({
  id,
  user_id: user.id,
  handle: user.handle,
  text,
  created_at: `2026-11-07T22:${String(minute).padStart(2, '0')}:00Z`,
});

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

describe('tab Chat', () => {
  it('senza stanze invita a dichiarare una serata', async () => {
    seedChatBackend({ rooms: [] });
    await renderApp('ready', '/chat');
    expect(await screen.findByText('chat:list.empty')).toBeOnTheScreen();
  });

  it('mostra la stanza con amici dentro e ultimo messaggio, e un tocco apre la chat', async () => {
    seedChatBackend({
      rooms: [ARENA],
      messages: [message('m1', VOLPE, 'ci vediamo alle 11', 5)],
      users: [VOLPE],
      accepted: ['u-volpe'],
    });
    await renderApp('ready', '/chat');
    expect(await screen.findByText('Arena Club')).toBeOnTheScreen();
    expect(screen.getByText('chat:list.friendsInside({"count":1})')).toBeOnTheScreen();
    await fireEvent.press(screen.getByText('Arena Club'));
    expect(
      await screen.findByRole('header', { name: 'chat:venueTitle({"venue":"Arena Club"})' }),
    ).toBeOnTheScreen();
    expect(screen.getByText('chat:subtitle')).toBeOnTheScreen();
  });
});

describe('chat di serata', () => {
  afterEach(() => jest.restoreAllMocks());

  const open = () => renderApp('ready', '/night/r1/chat');

  it('mostra me e chi seguo, mai chi non seguo, anche se il server lo mandasse', async () => {
    seedChatBackend({
      rooms: [ARENA],
      messages: [
        message('m1', VOLPE, 'ciao da volpe', 1),
        message('m2', GATTO, 'messaggio di un estraneo', 2),
        {
          ...message('m3', { id: 'user-1', handle: 'lince.rosso' }, 'ciao da me', 3),
          is_mine: true,
        },
      ],
      users: [VOLPE, GATTO],
      accepted: ['u-volpe'],
    });
    await open();
    expect(await screen.findByText('ciao da volpe')).toBeOnTheScreen();
    expect(screen.getByText('ciao da me')).toBeOnTheScreen();
    expect(screen.queryByText('messaggio di un estraneo')).toBeNull();
    expect(screen.getByText('chat:created')).toBeOnTheScreen();
  });

  it('scrivo e invio un messaggio: compare subito e parte la RPC', async () => {
    seedChatBackend({ rooms: [ARENA], users: [VOLPE], accepted: ['u-volpe'] });
    await open();
    await fireEvent.changeText(await screen.findByLabelText('chat:composer.placeholder'), 'arrivo');
    await fireEvent.press(screen.getByLabelText('chat:composer.send'));
    expect(await screen.findByText('arrivo')).toBeOnTheScreen();
    await waitFor(() => expect(rpcCalls('send_chat_message')).toHaveLength(1));
    expect(rpcCalls('send_chat_message')[0]?.[1]).toEqual({
      p_room_id: 'r1',
      p_text: 'arrivo',
      p_photo_path: null,
    });
  });

  it('con meno di 12 ore alla fine avvisa che la chat si cancella', async () => {
    const soon = new Date(Date.now() + 3 * 3_600_000 - 1000).toISOString();
    seedChatBackend({ rooms: [{ ...ARENA, expires_at: soon }] });
    await open();
    expect(await screen.findByText('chat:expiresIn({"count":3})')).toBeOnTheScreen();
  });

  it('le foto dei seguiti compaiono nella striscia con URL firmato', async () => {
    seedChatBackend({
      rooms: [ARENA],
      messages: [{ ...message('p1', VOLPE, '', 4), kind: 'photo', text: null }],
      users: [VOLPE],
      accepted: ['u-volpe'],
    });
    fakeSupabase.functions.invoke.mockResolvedValue({
      data: { urls: [{ messageId: 'p1', url: 'https://signed.test/p1' }] },
      error: null,
    });
    await open();
    expect(await screen.findByText('chat:photos({"count":1})')).toBeOnTheScreen();
    await waitFor(() =>
      expect(fakeSupabase.functions.invoke).toHaveBeenCalledWith('chat-photo-urls', {
        body: { messageIds: ['p1'] },
      }),
    );
  });

  it('scatto una foto: viene ripulita, caricata nel mio prefisso e inviata come messaggio', async () => {
    // Android opens the picker right away; the iOS wait for onDismiss is covered in usePhotoFlow.test.
    jest.replaceProperty(Platform, 'OS', 'android');
    jest
      .mocked(ImagePicker.requestCameraPermissionsAsync)
      .mockResolvedValue({ granted: true } as never);
    jest.mocked(ImagePicker.launchCameraAsync).mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///original.heic', width: 4032, height: 3024 }],
    } as never);
    jest.mocked(Crypto.randomUUID).mockReturnValue('11111111-2222-4333-8444-555555555555');
    global.fetch = jest.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })) as never;
    seedChatBackend({ rooms: [ARENA] });
    await open();
    await fireEvent.press(await screen.findByLabelText('chat:composer.photo'));
    await fireEvent.press(await screen.findByText('ui:photoSource.camera'));
    await waitFor(() => expect(rpcCalls('send_chat_message')).toHaveLength(1));
    expect(fakeStorageUpload).toHaveBeenCalledWith(
      'user-1/11111111-2222-4333-8444-555555555555.jpg',
      expect.any(ArrayBuffer),
      { contentType: 'image/jpeg', upsert: false },
    );
    expect(global.fetch).toHaveBeenCalledWith('file:///clean.jpg');
    expect(rpcCalls('send_chat_message')[0]?.[1]).toEqual({
      p_room_id: 'r1',
      p_text: null,
      p_photo_path: 'user-1/11111111-2222-4333-8444-555555555555.jpg',
    });
  });

  it('permesso della fotocamera negato: lo dice e non invia nulla', async () => {
    // Android opens the picker right away; the iOS wait for onDismiss is covered in usePhotoFlow.test.
    jest.replaceProperty(Platform, 'OS', 'android');
    jest
      .mocked(ImagePicker.requestCameraPermissionsAsync)
      .mockResolvedValue({ granted: false } as never);
    seedChatBackend({ rooms: [ARENA] });
    await open();
    await fireEvent.press(await screen.findByLabelText('chat:composer.photo'));
    await fireEvent.press(await screen.findByText('ui:photoSource.camera'));
    expect(await screen.findByText('ui:photoSource.denied')).toBeOnTheScreen();
    expect(rpcCalls('send_chat_message')).toHaveLength(0);
  });

  it('tag a un utente che non seguo: chip Segui che manda la richiesta', async () => {
    seedChatBackend({ rooms: [ARENA], users: [ORSO] });
    await open();
    await fireEvent.changeText(
      await screen.findByLabelText('chat:composer.placeholder'),
      'ehi @orso.verde',
    );
    await fireEvent.press(await screen.findByText('chat:composer.follow'));
    await waitFor(() => expect(rpcCalls('request_follow')).toHaveLength(1));
    expect(rpcCalls('request_follow')[0]?.[1]).toEqual({ p_user_id: 'u-orso' });
    expect(await screen.findByText('chat:composer.requested')).toBeOnTheScreen();
  });

  it('tocco lungo su un messaggio altrui → Segnala messaggio', async () => {
    seedChatBackend({
      rooms: [ARENA],
      messages: [message('m1', VOLPE, 'ciao da volpe', 1)],
      users: [VOLPE],
      accepted: ['u-volpe'],
    });
    await open();
    await fireEvent(await screen.findByText('ciao da volpe'), 'longPress');
    await fireEvent.press(await screen.findByText('chat:actions.report'));
    await waitFor(() => expect(rpcCalls('report')).toHaveLength(1));
    expect(rpcCalls('report')[0]?.[1]).toMatchObject({
      p_target_kind: 'message',
      p_target_id: 'm1',
    });
    expect(await screen.findByText('chat:actions.reported')).toBeOnTheScreen();
  });

  it('tocco lungo → Blocca utente chiede conferma e poi i suoi messaggi spariscono', async () => {
    const backend = seedChatBackend({
      rooms: [ARENA],
      messages: [message('m1', VOLPE, 'ciao da volpe', 1)],
      users: [VOLPE],
      accepted: ['u-volpe'],
    });
    await open();
    await fireEvent(await screen.findByText('ciao da volpe'), 'longPress');
    await fireEvent.press(await screen.findByText('chat:actions.block'));
    expect(rpcCalls('block_user')).toHaveLength(0);
    backend.messages.length = 0;
    await fireEvent.press(await screen.findByText('chat:actions.blockConfirm'));
    await waitFor(() => expect(rpcCalls('block_user')).toHaveLength(1));
    await waitFor(() => expect(screen.queryByText('ciao da volpe')).toBeNull());
  });

  it('sui miei messaggi il tocco lungo non offre di segnalare', async () => {
    seedChatBackend({
      rooms: [ARENA],
      messages: [
        {
          ...message('m1', { id: 'user-1', handle: 'lince.rosso' }, 'ciao da me', 1),
          is_mine: true,
        },
      ],
    });
    await open();
    await fireEvent(await screen.findByText('ciao da me'), 'longPress');
    expect(screen.queryByText('chat:actions.report')).toBeNull();
  });
});
