import { renderHook, waitFor } from '@testing-library/react-native';
import { act } from 'react';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { useCancelEvent, useCreateEvent, useMyEvents, useUpdateEvent } from './hooks';
import type { EventInput } from './domain/eventForm';

const input: EventInput = {
  venueId: 'v1',
  name: 'Notte',
  description: null,
  startsAt: '2026-11-07T21:00:00.000Z',
  endsAt: '2026-11-08T03:00:00.000Z',
  ageBands: [],
  genders: [],
};

const invalidatedKeys = (spy: jest.SpyInstance) =>
  spy.mock.calls.map(([filters]) => (filters as { queryKey: unknown }).queryKey);

describe('useMyEvents', () => {
  it('ha una chiave per scope e non finisce mai su disco (contiene fasce di affluenza)', async () => {
    setFakeRpc({ get_my_creator_events: [] });
    const { Wrapper, client } = createQueryWrapper();
    await renderHook(() => useMyEvents('past'), { wrapper: Wrapper });
    await waitFor(() => expect(fakeSupabase.rpc).toHaveBeenCalled());
    const query = client.getQueryCache().find({ queryKey: ['myEvents', 'past'] });
    expect(query?.meta).toEqual({ persist: false });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_my_creator_events', { p_scope: 'past' });
  });
});

describe.each([
  ['crea', () => useCreateEvent(), (mutate: (v: never) => void) => mutate(input as never)],
  ['modifica', () => useUpdateEvent('e1'), (mutate: (v: never) => void) => mutate(input as never)],
  ['annulla', () => useCancelEvent(), (mutate: (v: never) => void) => mutate('e1' as never)],
])('mutation %s', (_label, useHook, run) => {
  it('a successo ricarica le liste del creator, il dettaglio e le serate della città', async () => {
    setFakeRpc({ create_event: 'e1' });
    const { Wrapper, client } = createQueryWrapper();
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useHook(), { wrapper: Wrapper });
    await act(async () => run(result.current.mutate as (v: never) => void));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidatedKeys(spy)).toEqual(
      expect.arrayContaining([['myEvents'], ['eventAttendance'], ['eventDetail'], ['cityEvents']]),
    );
  });
});

describe('useCancelEvent', () => {
  it('ricarica anche dichiarazione, mappa e stanze di chat (le dichiarazioni scadono)', async () => {
    setFakeRpc({});
    const { Wrapper, client } = createQueryWrapper();
    const spy = jest.spyOn(client, 'invalidateQueries');
    const { result } = await renderHook(() => useCancelEvent(), { wrapper: Wrapper });
    await act(async () => result.current.mutate('e1'));
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(invalidatedKeys(spy)).toEqual(
      expect.arrayContaining([['myDeclaration'], ['cityMap'], ['chatRooms'], ['postTarget']]),
    );
  });
});
