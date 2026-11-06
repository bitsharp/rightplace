import { renderHook, waitFor } from '@testing-library/react-native';
import { useIsFocused } from 'expo-router';
import { act } from 'react';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { CITY_EVENTS_REFETCH_MS, useCityEvents, useEventDetail } from './hooks';

jest.mock('expo-router', () => ({ useIsFocused: jest.fn() }));

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name).length;

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(useIsFocused).mockReturnValue(true);
});
afterEach(() => jest.useRealTimers());

describe('useCityEvents', () => {
  it('aggiorna ogni minuto a schermata a fuoco e non scrive su disco', async () => {
    setFakeRpc({ get_city_events: [] });
    const { Wrapper, client } = createQueryWrapper();
    await renderHook(() => useCityEvents('milano', 'techno'), { wrapper: Wrapper });
    await waitFor(() => expect(rpcCalls('get_city_events')).toBe(1));
    await act(async () => jest.advanceTimersByTime(CITY_EVENTS_REFETCH_MS));
    await waitFor(() => expect(rpcCalls('get_city_events')).toBe(2));
    const query = client
      .getQueryCache()
      .find({ queryKey: ['cityEvents', 'milano', 'techno', null] });
    expect(query?.meta).toEqual({ persist: false });
  });

  it('non parte senza città (nessuna chiamata a vuoto)', async () => {
    setFakeRpc({ get_city_events: [] });
    const { Wrapper } = createQueryWrapper();
    await renderHook(() => useCityEvents('', ''), { wrapper: Wrapper });
    await act(async () => jest.advanceTimersByTime(1000));
    expect(rpcCalls('get_city_events')).toBe(0);
  });
});

describe('useEventDetail', () => {
  it('una serata che non esiste non si riprova', async () => {
    fakeSupabase.rpc.mockResolvedValue({ data: null, error: { message: 'NOT_FOUND' } });
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useEventDetail('e1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(rpcCalls('get_event_detail')).toBe(1);
  });
});
