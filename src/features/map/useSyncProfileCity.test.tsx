import type { QueryClient } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { act } from 'react';

import { useAuthStore } from '@/features/auth/store/authStore';
import { CITY_TIMEZONE_KEY } from '@/features/notifications/hooks';
import { myProfileKey } from '@/features/profile/hooks';
import { useCoarsePositionStore } from '@/features/profile/location';
import { fakeProfileRow, fakeSupabase, setFakeRpc, setFakeTable } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { useMapStore } from './store/mapStore';
import { useSyncProfileCity } from './useSyncProfileCity';

const CITIES = [
  {
    slug: 'las-palmas',
    name: 'Las Palmas',
    country: 'ES',
    lat: 28.1235,
    lng: -15.4134,
    default_zoom: 13,
  },
  { slug: 'milano', name: 'Milano', country: 'IT', lat: 45.4642, lng: 9.19, default_zoom: 13 },
];
const NEAR_LAS_PALMAS = { lat: 28.13, lng: -15.42 };

const savedCities = () =>
  fakeSupabase.rpc.mock.calls
    .filter(([name]) => name === 'set_profile_city')
    .map(([, args]) => (args as { p_city_slug: string }).p_city_slug);

function useBackend(saveResult: 'ok' | 'error' = 'ok') {
  setFakeRpc({
    get_active_cities: CITIES,
    set_profile_city: (args: unknown) => {
      if (saveResult === 'error') throw new Error('boom');
      const slug = (args as { p_city_slug: string }).p_city_slug;
      setFakeTable('profiles', [fakeProfileRow({ cities: { slug } })]);
      return null;
    },
  });
}

async function renderSync(enabled = true, prepare?: (client: QueryClient) => void) {
  const { Wrapper, client } = createQueryWrapper();
  prepare?.(client);
  const view = await renderHook(({ on }: { on: boolean }) => useSyncProfileCity(on), {
    wrapper: Wrapper,
    initialProps: { on: enabled },
  });
  await waitFor(() => expect(client.getQueryData(myProfileKey('user-1'))).toBeDefined());
  return { ...view, client };
}

describe('useSyncProfileCity', () => {
  beforeEach(() => {
    useCoarsePositionStore.setState({ cell: null });
    useAuthStore.setState({
      initialized: true,
      session: { userId: 'user-1', email: 'lince@example.com', emailConfirmed: true },
    });
    setFakeTable('profiles', [fakeProfileRow()]);
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('con auto e posizione spenta non chiama nulla', async () => {
    useBackend();
    await renderSync();
    await act(async () => undefined);
    expect(savedCities()).toEqual([]);
  });

  it('una scelta esplicita diversa dalla città del profilo la salva una volta sola', async () => {
    useBackend();
    useMapStore.setState({ cityPreference: 'las-palmas' });
    const { rerender } = await renderSync();
    await waitFor(() => expect(savedCities()).toEqual(['las-palmas']));
    await rerender({ on: true });
    await act(async () => undefined);
    expect(savedCities()).toEqual(['las-palmas']);
  });

  it('non richiama quando la scelta coincide con la città del profilo', async () => {
    useBackend();
    useMapStore.setState({ cityPreference: 'milano' });
    await renderSync();
    await act(async () => undefined);
    expect(savedCities()).toEqual([]);
  });

  it('la città rilevata dalla cella grossolana viene salvata', async () => {
    useBackend();
    await renderSync();
    await act(async () => useCoarsePositionStore.setState({ cell: NEAR_LAS_PALMAS }));
    await waitFor(() => expect(savedCities()).toEqual(['las-palmas']));
  });

  it('un nuovo cambio effettivo produce una nuova chiamata', async () => {
    useBackend();
    useMapStore.setState({ cityPreference: 'las-palmas' });
    await renderSync();
    await waitFor(() => expect(savedCities()).toEqual(['las-palmas']));
    await act(async () => useMapStore.setState({ cityPreference: 'milano' }));
    await waitFor(() => expect(savedCities()).toEqual(['las-palmas', 'milano']));
  });

  it('non rimanda la stessa città se il profilo risulta ancora vecchio', async () => {
    setFakeRpc({ get_active_cities: CITIES, set_profile_city: null });
    useMapStore.setState({ cityPreference: 'las-palmas' });
    await renderSync();
    await waitFor(() => expect(savedCities()).toEqual(['las-palmas']));
    await act(async () => undefined);
    expect(savedCities()).toEqual(['las-palmas']);
  });

  it('dopo il salvataggio invalida il profilo e i fusi orari', async () => {
    useBackend();
    useMapStore.setState({ cityPreference: 'las-palmas' });
    let invalidated: unknown[] = [];
    await renderSync(true, (client) => {
      const original = client.invalidateQueries.bind(client);
      jest.spyOn(client, 'invalidateQueries').mockImplementation((filters) => {
        invalidated = [...invalidated, filters?.queryKey];
        return original(filters);
      });
    });
    await waitFor(() => expect(savedCities()).toEqual(['las-palmas']));
    await waitFor(() =>
      expect(invalidated).toEqual(
        expect.arrayContaining([myProfileKey('user-1'), CITY_TIMEZONE_KEY]),
      ),
    );
  });

  it('se il salvataggio fallisce non rompe nulla, scrive un log senza dati e non insiste', async () => {
    useBackend('error');
    useMapStore.setState({ cityPreference: 'las-palmas' });
    await renderSync();
    await waitFor(() => expect(console.warn).toHaveBeenCalledTimes(1));
    expect(jest.mocked(console.warn).mock.calls[0]).toEqual(['City sync failed']);
    await act(async () => undefined);
    expect(savedCities()).toEqual(['las-palmas']);
  });

  it('da disabilitato non chiama nulla', async () => {
    useBackend();
    useMapStore.setState({ cityPreference: 'las-palmas' });
    await renderSync(false);
    await act(async () => undefined);
    expect(savedCities()).toEqual([]);
  });
});
