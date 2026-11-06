import { renderHook, waitFor } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import { useIsFocused } from 'expo-router';
import { act } from 'react';

import { MY_DECLARATION_KEY } from '@/features/map/hooks';
import type { MyDeclaration } from '@/features/map/api';
import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import {
  useDeclare,
  useUndeclare,
  useVenueDetail,
  useVenueStats,
  VENUE_STATS_REFETCH_MS,
} from './hooks';

jest.mock('expo-router', () => ({ useIsFocused: jest.fn() }));

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name).length;

const before: MyDeclaration = {
  venueId: 'other',
  venueName: 'Altro Locale',
  eventId: null,
  intent: 'maybe',
  expiresAt: '2026-11-07T04:00:00Z',
};

const arena = { kind: 'night' as const, id: 'arena' };
const vars = {
  target: arena,
  intent: 'going' as const,
  venue: { id: 'arena', name: 'Arena Club' },
};

// An RPC that stays pending until the test releases it: shows the state *during* the mutation.
function holdRpc(name: string) {
  let release: (error?: unknown) => void = () => undefined;
  const gate = new Promise<{ data: unknown; error: unknown }>((resolve) => {
    release = (error) => resolve({ data: null, error: error ?? null });
  });
  fakeSupabase.rpc.mockImplementation(async (called: string) =>
    called === name ? gate : { data: null, error: null },
  );
  return release;
}

describe('useVenueDetail', () => {
  it('usa una chiave per locale, valida un’ora e può essere salvata su disco', async () => {
    setFakeRpc({
      get_venue_detail: [
        {
          venue_id: 'v1',
          name: 'Arena',
          kind: 'club',
          address: null,
          opening_hours: null,
          google_place_id: 'p',
          lat: 1,
          lng: 2,
          city_slug: 'milano',
          city_name: 'Milano',
          country: 'IT',
          timezone: 'Europe/Rome',
          taxi_number: null,
        },
      ],
    });
    const { Wrapper, client } = createQueryWrapper();
    const { result } = await renderHook(() => useVenueDetail('v1'), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const query = client.getQueryCache().find({ queryKey: ['venueDetail', 'v1'] });
    expect(query?.observers[0]?.options.staleTime).toBe(60 * 60 * 1000);
    expect(query?.meta).toBeUndefined();
  });
});

describe('useVenueStats', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.mocked(useIsFocused).mockReturnValue(true);
    fakeSupabase.rpc.mockResolvedValue({ data: [], error: null });
  });
  afterEach(() => jest.useRealTimers());

  it('aggiorna ogni 60 secondi a schermata a fuoco e non scrive su disco', async () => {
    expect(VENUE_STATS_REFETCH_MS).toBe(60_000);
    const { Wrapper, client } = createQueryWrapper();
    await renderHook(() => useVenueStats('v1', 'going'), { wrapper: Wrapper });
    await waitFor(() => expect(rpcCalls('get_venue_stats')).toBe(1));
    await act(async () => jest.advanceTimersByTime(VENUE_STATS_REFETCH_MS));
    await waitFor(() => expect(rpcCalls('get_venue_stats')).toBe(2));
    const query = client.getQueryCache().find({ queryKey: ['venueStats', 'v1', 'going'] });
    expect(query?.meta).toEqual({ persist: false });
  });

  it('non aggiorna in background', async () => {
    jest.mocked(useIsFocused).mockReturnValue(false);
    const { Wrapper } = createQueryWrapper();
    await renderHook(() => useVenueStats('v1', 'all'), { wrapper: Wrapper });
    await waitFor(() => expect(rpcCalls('get_venue_stats')).toBe(1));
    await act(async () => jest.advanceTimersByTime(VENUE_STATS_REFETCH_MS * 3));
    expect(rpcCalls('get_venue_stats')).toBe(1);
  });
});

describe('useDeclare', () => {
  it('aggiorna subito la dichiarazione prima della risposta del server', async () => {
    const release = holdRpc('declare');
    const { Wrapper, client } = createQueryWrapper();
    client.setQueryData(MY_DECLARATION_KEY, before);
    const { result } = await renderHook(() => useDeclare(), { wrapper: Wrapper });
    await act(async () => {
      result.current.mutate(vars);
    });
    expect(client.getQueryData<MyDeclaration>(MY_DECLARATION_KEY)).toMatchObject({
      venueId: 'arena',
      venueName: 'Arena Club',
      intent: 'going',
    });
    await act(async () => release());
  });

  it('dà il feedback aptico di conferma al tap', async () => {
    const release = holdRpc('declare');
    const { Wrapper } = createQueryWrapper();
    const { result } = await renderHook(() => useDeclare(), { wrapper: Wrapper });
    await act(async () => {
      result.current.mutate(vars);
    });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith('success');
    await act(async () => release());
  });

  it('se il server rifiuta, ripristina la dichiarazione precedente', async () => {
    const release = holdRpc('declare');
    const { Wrapper, client } = createQueryWrapper();
    client.setQueryData(MY_DECLARATION_KEY, before);
    const { result } = await renderHook(() => useDeclare(), { wrapper: Wrapper });
    await act(async () => {
      result.current.mutate(vars);
    });
    await act(async () => release({ message: 'VENUE_NOT_ACTIVE' }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData(MY_DECLARATION_KEY)).toEqual(before);
  });

  it('a successo ricarica dichiarazione, mappa, statistiche del locale e storie', async () => {
    setFakeRpc({});
    const { Wrapper, client } = createQueryWrapper();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useDeclare(), { wrapper: Wrapper });
    await act(async () => {
      result.current.mutate(vars);
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([
        MY_DECLARATION_KEY,
        ['cityMap'],
        ['venueStats', 'arena'],
        ['stories'],
      ]),
    );
  });

  it('a successo ricarica anche serate, dettaglio serata, bacheca post e stanze di chat', async () => {
    setFakeRpc({});
    const { Wrapper, client } = createQueryWrapper();
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useDeclare(), { wrapper: Wrapper });
    await act(async () => {
      result.current.mutate({
        target: { kind: 'event', id: 'e1' },
        intent: 'going',
        venue: { id: 'arena', name: 'Arena Club' },
      });
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([['cityEvents'], ['eventDetail'], ['postTarget'], ['chatRooms']]),
    );
  });

  it('per un evento aggiorna la dichiarazione con l’evento', async () => {
    const release = holdRpc('declare');
    const { Wrapper, client } = createQueryWrapper();
    const { result } = await renderHook(() => useDeclare(), { wrapper: Wrapper });
    await act(async () => {
      result.current.mutate({
        target: { kind: 'event', id: 'e1' },
        intent: 'maybe',
        venue: { id: 'arena', name: 'Arena Club' },
      });
    });
    expect(client.getQueryData<MyDeclaration>(MY_DECLARATION_KEY)).toMatchObject({
      venueId: 'arena',
      eventId: 'e1',
      intent: 'maybe',
    });
    await act(async () => release());
  });
});

describe('useUndeclare', () => {
  it('toglie subito la dichiarazione e la ricarica a fine chiamata', async () => {
    const release = holdRpc('undeclare');
    const { Wrapper, client } = createQueryWrapper();
    client.setQueryData(MY_DECLARATION_KEY, before);
    const invalidate = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useUndeclare(), { wrapper: Wrapper });
    await act(async () => {
      result.current.mutate();
    });
    expect(client.getQueryData(MY_DECLARATION_KEY)).toBeNull();
    await act(async () => release());
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const keys = invalidate.mock.calls.map(([filters]) => filters?.queryKey);
    expect(keys).toEqual(
      expect.arrayContaining([MY_DECLARATION_KEY, ['cityMap'], ['venueStats'], ['stories']]),
    );
  });

  it('se il server rifiuta, riporta la dichiarazione', async () => {
    const release = holdRpc('undeclare');
    const { Wrapper, client } = createQueryWrapper();
    client.setQueryData(MY_DECLARATION_KEY, before);
    const { result } = await renderHook(() => useUndeclare(), { wrapper: Wrapper });
    await act(async () => {
      result.current.mutate();
    });
    await act(async () => release({ message: 'NOT_AUTHENTICATED' }));
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(client.getQueryData(MY_DECLARATION_KEY)).toEqual(before);
  });
});
