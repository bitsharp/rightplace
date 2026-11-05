import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { renderApp } from '@/test/appFlows';
import { seedFeedBackend } from '@/test/feedBackend';
import { fakeStorageUpload, fakeSupabase } from '@/test/fakeSupabase';

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

const UUID_POST = '11111111-2222-4333-8444-555555555555';
const UUID_CHAT = '66666666-7777-4888-8999-000000000000';

function pickFromLibrary() {
  jest.mocked(ImagePicker.launchImageLibraryAsync).mockResolvedValue({
    canceled: false,
    assets: [{ uri: 'file:///original.heic', width: 4032, height: 3024 }],
  } as never);
  jest.mocked(Crypto.randomUUID).mockReturnValueOnce(UUID_POST).mockReturnValueOnce(UUID_CHAT);
  global.fetch = jest.fn(async () => ({ arrayBuffer: async () => new ArrayBuffer(8) })) as never;
}

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

describe('nuovo post', () => {
  afterEach(() => jest.restoreAllMocks());

  it('con la chat viva: la foto ripulita va in posts e in chat-photos, poi create_post', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    pickFromLibrary();
    const backend = seedFeedBackend({ target: { room_id: 'r1' } });
    await renderApp('ready', '/post/new');
    await fireEvent.press(await screen.findByRole('button', { name: 'post:photo.add' }));
    await fireEvent.press(await screen.findByText('ui:photoSource.library'));
    expect(await screen.findByLabelText('post:photo.preview')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'post:publish' }));
    await waitFor(() => expect(backend.created).toHaveLength(1));
    expect(fakeSupabase.storage.from.mock.calls.map(([bucket]) => bucket)).toEqual([
      'posts',
      'chat-photos',
    ]);
    expect(fakeStorageUpload.mock.calls.map(([path]) => path)).toEqual([
      `user-1/${UUID_POST}.jpg`,
      `user-1/${UUID_CHAT}.jpg`,
    ]);
    expect(backend.created[0]).toEqual({
      caption: null,
      photoPath: `user-1/${UUID_POST}.jpg`,
      chatPhotoPath: `user-1/${UUID_CHAT}.jpg`,
    });
  });

  it('senza chat viva la foto va solo in posts', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    pickFromLibrary();
    const backend = seedFeedBackend({ target: { room_id: null } });
    await renderApp('ready', '/post/new');
    await fireEvent.press(await screen.findByRole('button', { name: 'post:photo.add' }));
    await fireEvent.press(await screen.findByText('ui:photoSource.library'));
    await fireEvent.press(await screen.findByRole('button', { name: 'post:publish' }));
    await waitFor(() => expect(backend.created).toHaveLength(1));
    expect(fakeSupabase.storage.from.mock.calls.map(([bucket]) => bucket)).toEqual(['posts']);
    expect(backend.created[0]?.chatPhotoPath).toBeNull();
  });

  it('su iOS il selettore non parte finché il foglio non si è chiuso (onDismiss)', async () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    pickFromLibrary();
    seedFeedBackend({ target: {} });
    await renderApp('ready', '/post/new');
    await fireEvent.press(await screen.findByRole('button', { name: 'post:photo.add' }));
    await fireEvent.press(await screen.findByText('ui:photoSource.library'));
    expect(ImagePicker.launchImageLibraryAsync).not.toHaveBeenCalled();
  });

  it('la foto scelta si può togliere e Pubblica torna disabilitato', async () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    pickFromLibrary();
    seedFeedBackend({ target: {} });
    await renderApp('ready', '/post/new');
    await fireEvent.press(await screen.findByRole('button', { name: 'post:photo.add' }));
    await fireEvent.press(await screen.findByText('ui:photoSource.library'));
    await fireEvent.press(await screen.findByRole('button', { name: 'post:photo.remove' }));
    expect(screen.queryByLabelText('post:photo.preview')).toBeNull();
    expect(screen.getByRole('button', { name: 'post:publish' })).toBeDisabled();
  });

  it('il testo è limitato a 500 caratteri e c’è il contatore', async () => {
    seedFeedBackend({ target: {} });
    await renderApp('ready', '/post/new');
    const input = await screen.findByLabelText('post:caption.label');
    expect(input.props.maxLength).toBe(500);
    await fireEvent.changeText(input, 'ciao');
    expect(screen.getByText('post:caption.counter({"count":4,"max":500})')).toBeOnTheScreen();
  });

  it('un errore del server compare tradotto e non chiude la schermata', async () => {
    seedFeedBackend({ target: {} });
    const base = fakeSupabase.rpc.getMockImplementation();
    fakeSupabase.rpc.mockImplementation(async (name: string, args?: unknown) =>
      name === 'create_post'
        ? { data: null, error: { message: 'NO_RECENT_DECLARATION' } }
        : (base?.(name, args) ?? { data: null, error: null }),
    );
    await renderApp('ready', '/post/new');
    await fireEvent.changeText(await screen.findByLabelText('post:caption.label'), 'ciao');
    await fireEvent.press(screen.getByRole('button', { name: 'post:publish' }));
    expect(await screen.findByText('errors:rpc.NO_RECENT_DECLARATION')).toBeOnTheScreen();
    expect(rpcCalls('create_post')).toHaveLength(1);
    expect(screen.getByRole('header', { name: 'post:title' })).toBeOnTheScreen();
  });
});
