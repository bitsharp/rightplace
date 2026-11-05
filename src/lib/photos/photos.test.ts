import * as Crypto from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { RpcError } from '@/lib/rpcError';
import { fakeStorageUpload, fakeSupabase } from '@/test/fakeSupabase';

import { pickPhoto, preparePhoto, uploadPhoto } from './photos';

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
}));
jest.mock('expo-crypto', () => ({ randomUUID: jest.fn() }));
jest.mock('expo-image-manipulator', () => ({
  ImageManipulator: { manipulate: jest.fn() },
  SaveFormat: { JPEG: 'jpeg' },
}));

const picker = jest.mocked(ImagePicker);
const manipulate = jest.mocked(ImageManipulator.manipulate);

const asset = (overrides: Record<string, unknown> = {}) => ({
  uri: 'file:///original.heic',
  width: 4032,
  height: 3024,
  ...overrides,
});

// A manipulator whose every step is recorded, so tests see what was asked of it.
function stubManipulator(rendered = { width: 1280, height: 960 }) {
  const saveAsync = jest.fn(async () => ({ uri: 'file:///clean.jpg', ...rendered }));
  const resize = jest.fn();
  const renderAsync = jest.fn(async () => ({ ...rendered, saveAsync }));
  const context = { resize, renderAsync };
  resize.mockReturnValue(context);
  manipulate.mockReturnValue(context as unknown as ReturnType<typeof manipulate>);
  return { saveAsync, resize, renderAsync };
}

describe('pickPhoto', () => {
  it("dalla fotocamera chiede il permesso solo ora, e senza leggere l'EXIF", async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: true } as never);
    picker.launchCameraAsync.mockResolvedValue({ canceled: false, assets: [asset()] } as never);
    await expect(pickPhoto('camera')).resolves.toEqual({
      status: 'picked',
      photo: { uri: 'file:///original.heic', width: 4032, height: 3024 },
    });
    expect(picker.launchCameraAsync).toHaveBeenCalledWith(
      expect.objectContaining({ exif: false, quality: expect.any(Number) }),
    );
  });

  it('permesso fotocamera negato: non apre la fotocamera', async () => {
    picker.requestCameraPermissionsAsync.mockResolvedValue({ granted: false } as never);
    await expect(pickPhoto('camera')).resolves.toEqual({ status: 'denied' });
    expect(picker.launchCameraAsync).not.toHaveBeenCalled();
  });

  it('dalla galleria usa il selettore di sistema con exif: false', async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({
      canceled: false,
      assets: [asset()],
    } as never);
    const result = await pickPhoto('library');
    expect(result.status).toBe('picked');
    expect(picker.launchImageLibraryAsync).toHaveBeenCalledWith(
      expect.objectContaining({ exif: false }),
    );
  });

  it("se l'utente annulla non restituisce nessuna foto", async () => {
    picker.launchImageLibraryAsync.mockResolvedValue({ canceled: true, assets: null } as never);
    await expect(pickPhoto('library')).resolves.toEqual({ status: 'cancelled' });
  });
});

describe('preparePhoto', () => {
  it('riduce 4032×3024 a 1280×960 e ricodifica in JPEG', async () => {
    const { saveAsync, resize } = stubManipulator();
    await expect(preparePhoto(asset())).resolves.toBe('file:///clean.jpg');
    expect(manipulate).toHaveBeenCalledWith('file:///original.heic');
    expect(resize).toHaveBeenCalledWith({ width: 1280, height: 960 });
    expect(saveAsync).toHaveBeenCalledWith({ format: SaveFormat.JPEG, compress: 0.7 });
  });

  it('una foto 800×600 non viene ridimensionata né ingrandita', async () => {
    const { saveAsync, resize } = stubManipulator({ width: 800, height: 600 });
    await preparePhoto(asset({ width: 800, height: 600 }));
    expect(resize).not.toHaveBeenCalled();
    expect(saveAsync).toHaveBeenCalledWith({ format: SaveFormat.JPEG, compress: 0.7 });
  });

  it("se il selettore non dà le dimensioni le legge dall'immagine prima di ridurla", async () => {
    const { resize, renderAsync } = stubManipulator({ width: 4032, height: 3024 });
    await preparePhoto(asset({ width: 0, height: 0 }));
    expect(renderAsync).toHaveBeenCalled();
    expect(resize).toHaveBeenCalledWith({ width: 1280, height: 960 });
  });
});

describe('uploadPhoto', () => {
  beforeEach(() => {
    jest.mocked(Crypto.randomUUID).mockReturnValue('11111111-2222-4333-8444-555555555555');
    global.fetch = jest.fn(async () => ({
      arrayBuffer: async () => new ArrayBuffer(8),
    })) as unknown as typeof fetch;
  });

  it.each(['chat-photos', 'posts'] as const)(
    'carica il file ripulito in %s/<userId>/<uuid>.jpg come JPEG, senza sovrascrivere',
    async (bucket) => {
      const path = await uploadPhoto(bucket, 'user-1', 'file:///clean.jpg');
      expect(path).toBe('user-1/11111111-2222-4333-8444-555555555555.jpg');
      expect(fakeSupabase.storage.from).toHaveBeenCalledWith(bucket);
      expect(fakeStorageUpload).toHaveBeenCalledWith(path, expect.any(ArrayBuffer), {
        contentType: 'image/jpeg',
        upsert: false,
      });
      expect(global.fetch).toHaveBeenCalledWith('file:///clean.jpg');
    },
  );

  it('un errore di Storage diventa un errore tipizzato e non restituisce nessun path', async () => {
    fakeStorageUpload.mockResolvedValueOnce({ data: null, error: { message: 'denied' } });
    await expect(uploadPhoto('posts', 'user-1', 'file:///clean.jpg')).rejects.toEqual(
      new RpcError('UNKNOWN'),
    );
  });
});
