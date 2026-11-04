import { renderHook, waitFor } from '@testing-library/react-native';
import { useIsFocused } from 'expo-router';
import { act } from 'react';

import { fakeSupabase } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { CITY_MAP_REFETCH_MS, useCityMap } from './hooks';

jest.mock('expo-router', () => ({ useIsFocused: jest.fn() }));

const mapCalls = () =>
  fakeSupabase.rpc.mock.calls.filter(([name]) => name === 'get_city_map').length;

describe('useCityMap', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(useIsFocused).mockReturnValue(true);
    fakeSupabase.rpc.mockResolvedValue({ data: [], error: null });
  });
  afterEach(() => jest.useRealTimers());

  it('aggiorna la mappa ogni 60 secondi mentre la schermata è a fuoco', async () => {
    expect(CITY_MAP_REFETCH_MS).toBe(60_000);
    const { Wrapper } = createQueryWrapper();
    await renderHook(() => useCityMap('milano', 'general'), { wrapper: Wrapper });
    await waitFor(() => expect(mapCalls()).toBe(1));
    await act(async () => jest.advanceTimersByTime(CITY_MAP_REFETCH_MS));
    await waitFor(() => expect(mapCalls()).toBe(2));
  });

  it('non aggiorna in background quando la schermata non è a fuoco', async () => {
    jest.mocked(useIsFocused).mockReturnValue(false);
    const { Wrapper } = createQueryWrapper();
    await renderHook(() => useCityMap('milano', 'general'), { wrapper: Wrapper });
    await waitFor(() => expect(mapCalls()).toBe(1));
    await act(async () => jest.advanceTimersByTime(CITY_MAP_REFETCH_MS * 3));
    expect(mapCalls()).toBe(1);
  });

  it('ricarica quando la schermata torna a fuoco', async () => {
    jest.mocked(useIsFocused).mockReturnValue(false);
    const { Wrapper } = createQueryWrapper();
    const { rerender } = await renderHook(() => useCityMap('milano', 'general'), {
      wrapper: Wrapper,
    });
    await waitFor(() => expect(mapCalls()).toBe(1));
    jest.mocked(useIsFocused).mockReturnValue(true);
    await rerender({});
    await waitFor(() => expect(mapCalls()).toBe(2));
  });

  it('non chiama il server se disabilitata (vista amici non attiva)', async () => {
    const { Wrapper } = createQueryWrapper();
    await renderHook(() => useCityMap('milano', 'friends', false), { wrapper: Wrapper });
    await act(async () => jest.advanceTimersByTime(CITY_MAP_REFETCH_MS * 2));
    expect(mapCalls()).toBe(0);
  });

  it('usa una chiave per città e vista, senza scrivere su disco', async () => {
    const { Wrapper, client } = createQueryWrapper();
    await renderHook(() => useCityMap('milano', 'general'), { wrapper: Wrapper });
    await waitFor(() => expect(mapCalls()).toBe(1));
    const query = client.getQueryCache().find({ queryKey: ['cityMap', 'milano', 'general'] });
    expect(query?.meta).toEqual({ persist: false });
  });
});
