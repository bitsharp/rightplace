import { renderHook, waitFor } from '@testing-library/react-native';
import { act } from 'react';

import { useCoarsePositionStore } from '@/features/profile/location';
import { useAuthStore } from '@/features/auth/store/authStore';
import { fakeProfileRow, setFakeRpc, setFakeTable } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { useMapStore } from './store/mapStore';
import { useCurrentCity } from './useCurrentCity';

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

function renderCity() {
  const { Wrapper } = createQueryWrapper();
  return renderHook(() => useCurrentCity(), { wrapper: Wrapper });
}

describe('useCurrentCity', () => {
  beforeEach(() => {
    useCoarsePositionStore.setState({ cell: null });
    setFakeRpc({ get_active_cities: CITIES });
  });

  it('senza posizione e in automatico usa la città di default', async () => {
    const { result } = await renderCity();
    expect(result.current).toBe('milano');
  });

  it('in automatico con una cella vicino a Las Palmas sceglie Las Palmas', async () => {
    useCoarsePositionStore.setState({ cell: NEAR_LAS_PALMAS });
    const { result } = await renderCity();
    await waitFor(() => expect(result.current).toBe('las-palmas'));
  });

  it('la preferenza esplicita resta anche se la cella è in un’altra città', async () => {
    useMapStore.setState({ cityPreference: 'milano' });
    useCoarsePositionStore.setState({ cell: NEAR_LAS_PALMAS });
    const { result } = await renderCity();
    await waitFor(() => expect(result.current).toBe('milano'));
  });

  it('segue la cella quando arriva dopo', async () => {
    const { result } = await renderCity();
    await waitFor(() => expect(result.current).toBe('milano'));
    await act(async () => useCoarsePositionStore.setState({ cell: NEAR_LAS_PALMAS }));
    await waitFor(() => expect(result.current).toBe('las-palmas'));
  });

  it('in automatico e senza posizione usa la città salvata nel profilo', async () => {
    useAuthStore.setState({
      initialized: true,
      session: { userId: 'user-1', email: 'lince@example.com', emailConfirmed: true },
    });
    setFakeTable('profiles', [fakeProfileRow({ cities: { slug: 'las-palmas' } })]);
    const { result } = await renderCity();
    await waitFor(() => expect(result.current).toBe('las-palmas'));
  });

  it('una preferenza per una città non più attiva ricade su automatico', async () => {
    useMapStore.setState({ cityPreference: 'madrid' });
    const { result } = await renderCity();
    await waitFor(() => expect(result.current).toBe('milano'));
  });
});
