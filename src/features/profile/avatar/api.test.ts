import { RpcError } from '@/lib/rpcError';
import { fakeStorageUpload, fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';

import { clearAvatar, fetchAvatarUrls, uploadAndSetAvatar } from './api';

jest.mock('@/lib/photos/photos', () => ({
  uploadPhoto: jest.fn(async () => 'user-1/11111111-2222-4333-8444-555555555555.jpg'),
}));

const invoke = fakeSupabase.functions.invoke;

describe('fetchAvatarUrls', () => {
  it('oltre 100 id divide in più richieste e unisce i risultati (nessuna foto scartata)', async () => {
    const ids = Array.from({ length: 130 }, (_, i) => `u${String(i).padStart(3, '0')}`);
    invoke.mockImplementation(async (_name: string, options?: unknown) => {
      const { body } = options as { body: { userIds: string[] } };
      return {
        data: {
          urls: body.userIds.slice(-1).map((userId) => ({ userId, url: `https://s/${userId}` })),
        },
        error: null,
      };
    });
    const urls = await fetchAvatarUrls(ids);
    expect(invoke).toHaveBeenCalledTimes(2);
    expect(Object.keys(urls).sort()).toEqual(['u099', 'u129']);
  });

  it('chiede alla Edge Function solo gli id e restituisce una mappa id -> URL', async () => {
    invoke.mockResolvedValueOnce({
      data: { urls: [{ userId: 'u1', url: 'https://signed.test/u1' }] },
      error: null,
    });
    await expect(fetchAvatarUrls(['u1', 'u2'])).resolves.toEqual({ u1: 'https://signed.test/u1' });
    expect(invoke).toHaveBeenCalledWith('avatar-urls', { body: { userIds: ['u1', 'u2'] } });
  });

  it('senza id non chiama nulla', async () => {
    await expect(fetchAvatarUrls([])).resolves.toEqual({});
    expect(invoke).not.toHaveBeenCalled();
  });

  it('un errore della funzione diventa un errore tipizzato', async () => {
    invoke.mockResolvedValueOnce({ data: null, error: { message: 'boom' } });
    await expect(fetchAvatarUrls(['u1'])).rejects.toBeInstanceOf(RpcError);
  });
});

describe('uploadAndSetAvatar', () => {
  it('carica il JPEG ripulito nel bucket avatars e poi registra il path con set_avatar', async () => {
    const calls: string[] = [];
    setFakeRpc({ set_avatar: () => void calls.push('set_avatar') });
    const { uploadPhoto } = jest.requireMock('@/lib/photos/photos');
    await uploadAndSetAvatar('user-1', 'file:///clean.jpg');
    expect(uploadPhoto).toHaveBeenCalledWith('avatars', 'user-1', 'file:///clean.jpg');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('set_avatar', {
      p_path: 'user-1/11111111-2222-4333-8444-555555555555.jpg',
    });
    expect(calls).toEqual(['set_avatar']);
    expect(fakeStorageUpload).not.toHaveBeenCalled();
  });
});

describe('clearAvatar', () => {
  it('chiama clear_avatar', async () => {
    await clearAvatar();
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('clear_avatar', undefined);
  });
});
