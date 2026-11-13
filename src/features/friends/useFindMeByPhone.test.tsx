import { act, renderHook, waitFor } from '@testing-library/react-native';

import { fakeSupabase } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { PHONE_HASH_STATUS_KEY } from './keys';
import { useFindMeByPhone } from './useFindMeByPhone';

jest.mock('./useDefaultCountry', () => ({ useDefaultCountry: () => 'IT' }));
jest.mock('./digest', () => ({ sha256: async () => 'a'.repeat(64) }));

// Server stand-in: `registered` is what has_phone_hash answers; `failOn` makes one RPC fail.
function fakeServer(registered: boolean, failOn?: string) {
  const server = { registered };
  fakeSupabase.rpc.mockImplementation(async (name: string) => {
    if (name === failOn) return { data: null, error: { message: 'boom' } };
    if (name === 'set_my_phone_hash') server.registered = true;
    if (name === 'clear_my_phone_hash') server.registered = false;
    return { data: name === 'has_phone_hash' ? server.registered : null, error: null };
  });
  return server;
}

async function setup() {
  const { client, Wrapper } = createQueryWrapper();
  const hook = await renderHook(() => useFindMeByPhone(), { wrapper: Wrapper });
  return { client, ...hook };
}

describe('useFindMeByPhone', () => {
  it('riporta dal server che il numero è già registrato', async () => {
    fakeServer(true);
    const { result } = await setup();
    await waitFor(() => expect(result.current.registered).toBe(true));
  });

  it('senza hash sul server non risulta registrato', async () => {
    fakeServer(false);
    const { result } = await setup();
    await waitFor(() =>
      expect(fakeSupabase.rpc.mock.calls.some(([name]) => name === 'has_phone_hash')).toBe(true),
    );
    expect(result.current.registered).toBe(false);
  });

  it('dopo il salvataggio risulta registrato e il numero non resta', async () => {
    fakeServer(false);
    const { result } = await setup();
    await act(async () => result.current.setNumber('345 123 4567'));
    await act(async () => result.current.save());
    await waitFor(() => expect(result.current.registered).toBe(true));
    expect(result.current.status).toBe('saved');
    expect(result.current.number).toBe('');
  });

  it('dopo la rimozione non risulta più registrato', async () => {
    fakeServer(true);
    const { result } = await setup();
    await waitFor(() => expect(result.current.registered).toBe(true));
    await act(async () => result.current.clear());
    await waitFor(() => expect(result.current.registered).toBe(false));
    expect(result.current.status).toBe('cleared');
  });

  it('se il salvataggio fallisce lo stato resta non registrato', async () => {
    fakeServer(false, 'set_my_phone_hash');
    const { result } = await setup();
    await act(async () => result.current.setNumber('345 123 4567'));
    await act(async () => result.current.save());
    expect(result.current.status).not.toBe('saved');
    expect(result.current.registered).toBe(false);
  });

  it('se la rimozione fallisce lo stato resta registrato', async () => {
    fakeServer(true, 'clear_my_phone_hash');
    const { result } = await setup();
    await waitFor(() => expect(result.current.registered).toBe(true));
    await act(async () => result.current.clear());
    expect(result.current.status).not.toBe('cleared');
    expect(result.current.registered).toBe(true);
  });

  it('lo stato non viene persistito sul telefono', async () => {
    fakeServer(true);
    const { client, result } = await setup();
    await waitFor(() => expect(result.current.registered).toBe(true));
    expect(client.getQueryCache().find({ queryKey: PHONE_HASH_STATUS_KEY })?.meta).toEqual({
      persist: false,
    });
  });
});
