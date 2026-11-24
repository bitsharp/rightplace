import { act, renderHook, waitFor } from '@testing-library/react-native';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { AVATAR_URLS_ROOT_KEY } from './keys';
import { useAvatarUrls, useChangeAvatar, useRemoveAvatar } from './hooks';

jest.mock('@/lib/photos/photos', () => ({
  uploadPhoto: jest.fn(async () => 'me/11111111-2222-4333-8444-555555555555.jpg'),
}));

const invoke = fakeSupabase.functions.invoke;

describe('useAvatarUrls', () => {
  it('chiede un solo gruppo (senza doppioni, in ordine) e restituisce le foto visibili', async () => {
    invoke.mockResolvedValue({
      data: { urls: [{ userId: 'a', url: 'https://signed.test/a' }] },
      error: null,
    });
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useAvatarUrls(['b', 'a', 'b']), { wrapper: Wrapper });
    await waitFor(() => expect(result.current).toEqual({ a: 'https://signed.test/a' }));
    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('avatar-urls', { body: { userIds: ['a', 'b'] } });
  });

  it('non si salva su disco e resta fresca 50 minuti (gli URL firmati durano un’ora)', async () => {
    invoke.mockResolvedValue({ data: { urls: [] }, error: null });
    const { client, Wrapper } = createQueryWrapper();
    await renderHook(() => useAvatarUrls(['a']), { wrapper: Wrapper });
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    const query = client.getQueryCache().findAll({ queryKey: AVATAR_URLS_ROOT_KEY })[0];
    expect(query?.meta).toEqual({ persist: false });
    expect(query?.observers[0]?.options.staleTime).toBe(50 * 60 * 1000);
  });

  it('un altro elenco con gli stessi utenti trova subito gli URL già noti, senza nuova richiesta', async () => {
    invoke.mockResolvedValue({
      data: { urls: [{ userId: 'a', url: 'https://signed.test/a' }] },
      error: null,
    });
    const { Wrapper } = createQueryWrapper();
    const first = await renderHook(() => useAvatarUrls(['a', 'b']), { wrapper: Wrapper });
    await waitFor(() => expect(first.result.current).toEqual({ a: 'https://signed.test/a' }));
    const second = await renderHook(() => useAvatarUrls(['a']), { wrapper: Wrapper });
    expect(second.result.current).toEqual({ a: 'https://signed.test/a' });
    const third = await renderHook(() => useAvatarUrls(['b', 'a']), { wrapper: Wrapper });
    expect(third.result.current).toEqual({ a: 'https://signed.test/a' });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it('chiede solo i nuovi quando l’elenco cresce e intanto mostra gli URL già noti', async () => {
    invoke
      .mockResolvedValueOnce({
        data: { urls: [{ userId: 'a', url: 'https://signed.test/a' }] },
        error: null,
      })
      .mockResolvedValueOnce({
        data: { urls: [{ userId: 'c', url: 'https://signed.test/c' }] },
        error: null,
      });
    const { Wrapper } = createQueryWrapper();
    const { result, rerender } = await renderHook(
      ({ ids }: { ids: string[] }) => useAvatarUrls(ids),
      { wrapper: Wrapper, initialProps: { ids: ['a'] } },
    );
    await waitFor(() => expect(result.current).toEqual({ a: 'https://signed.test/a' }));
    await rerender({ ids: ['a', 'c'] });
    expect(result.current).toEqual({ a: 'https://signed.test/a' });
    await waitFor(() =>
      expect(result.current).toEqual({
        a: 'https://signed.test/a',
        c: 'https://signed.test/c',
      }),
    );
    expect(invoke).toHaveBeenLastCalledWith('avatar-urls', { body: { userIds: ['c'] } });
  });

  it('gli URL per singolo utente non si salvano su disco', async () => {
    invoke.mockResolvedValue({
      data: { urls: [{ userId: 'a', url: 'https://signed.test/a' }] },
      error: null,
    });
    const { client, Wrapper } = createQueryWrapper();
    await renderHook(() => useAvatarUrls(['a']), { wrapper: Wrapper });
    await waitFor(() => expect(invoke).toHaveBeenCalled());
    await waitFor(() =>
      expect(
        client.getQueryCache().findAll({ queryKey: [...AVATAR_URLS_ROOT_KEY, 'user'] }),
      ).not.toHaveLength(0),
    );
    for (const query of client.getQueryCache().findAll({ queryKey: AVATAR_URLS_ROOT_KEY })) {
      expect(query.meta).toEqual({ persist: false });
    }
  });

  it('senza id non parte nessuna richiesta', async () => {
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useAvatarUrls([undefined]), { wrapper: Wrapper });
    expect(result.current).toEqual({});
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe('cambiare e togliere la foto', () => {
  it('dopo il cambio ricarica gli URL delle foto', async () => {
    setFakeRpc({ set_avatar: null });
    const { client, Wrapper } = createQueryWrapper();
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useChangeAvatar('me'), { wrapper: Wrapper });
    await act(async () => result.current.mutateAsync('file:///clean.jpg'));
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('set_avatar', {
      p_path: 'me/11111111-2222-4333-8444-555555555555.jpg',
    });
    expect(spy).toHaveBeenCalledWith({ queryKey: AVATAR_URLS_ROOT_KEY });
  });

  it('togliere la foto chiama clear_avatar e ricarica gli URL', async () => {
    setFakeRpc({ clear_avatar: null });
    const { client, Wrapper } = createQueryWrapper();
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useRemoveAvatar(), { wrapper: Wrapper });
    await act(async () => result.current.mutateAsync());
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('clear_avatar', undefined);
    expect(spy).toHaveBeenCalledWith({ queryKey: AVATAR_URLS_ROOT_KEY });
  });
});
