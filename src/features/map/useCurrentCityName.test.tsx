import { renderHook, waitFor } from '@testing-library/react-native';

import { useCoarsePositionStore } from '@/features/profile/location';
import { setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { useMapStore } from './store/mapStore';
import { useCurrentCityName } from './useCurrentCityName';

const CITIES = [
  { slug: 'milano', name: 'Milano', country: 'IT', lat: 45.4642, lng: 9.19, default_zoom: 13 },
  {
    slug: 'las-palmas',
    name: 'Las Palmas',
    country: 'ES',
    lat: 28.1,
    lng: -15.4,
    default_zoom: 13,
  },
];

function renderName() {
  const { Wrapper } = createQueryWrapper();
  return renderHook(() => useCurrentCityName(), { wrapper: Wrapper });
}

describe('useCurrentCityName', () => {
  beforeEach(() => {
    useCoarsePositionStore.setState({ cell: null });
    useMapStore.setState({ cityPreference: 'auto' });
  });

  it('finché le città non sono caricate non c’è nessun nome', async () => {
    setFakeRpc({ get_active_cities: [] });
    const { result } = await renderName();
    expect(result.current).toBeNull();
  });

  it('dà il nome della città della mappa', async () => {
    setFakeRpc({ get_active_cities: CITIES });
    const { result } = await renderName();
    await waitFor(() => expect(result.current).toBe('Milano'));
  });

  it('segue la scelta esplicita dell’utente', async () => {
    useMapStore.setState({ cityPreference: 'las-palmas' });
    setFakeRpc({ get_active_cities: CITIES });
    const { result } = await renderName();
    await waitFor(() => expect(result.current).toBe('Las Palmas'));
  });
});
