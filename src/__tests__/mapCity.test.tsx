import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { act } from 'react';

import { useMapStore } from '@/features/map/store/mapStore';
import { useCoarsePositionStore } from '@/features/profile/location';
import { renderApp } from '@/test/appFlows';
import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

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
const NEAR_LAS_PALMAS = { lat: 28.1275, lng: -15.4175 };

const mapCityCalls = () =>
  fakeSupabase.rpc.mock.calls
    .filter(([name]) => name === 'get_city_map')
    .map(([, args]) => (args as { p_city_slug: string }).p_city_slug);
const searchCityCalls = () =>
  fakeSupabase.rpc.mock.calls
    .filter(([name]) => name === 'search_venues')
    .map(([, args]) => (args as { p_city_slug: string }).p_city_slug);
const mapLatitude = () => screen.getByTestId('map-view').props.initialRegion.latitude as number;

describe('città della mappa', () => {
  beforeEach(() => {
    useCoarsePositionStore.setState({ cell: null });
    jest
      .mocked(Location.getForegroundPermissionsAsync)
      .mockResolvedValue({ granted: false } as never);
    setFakeRpc({
      get_active_cities: CITIES,
      get_city_map: [],
      get_my_declaration: [],
      get_post_target: [],
      get_story_posts: [],
      get_stories: [],
      get_recommended_venue: [],
      search_venues: [],
    });
  });

  it('in automatico con la posizione a Las Palmas la mappa e la ricerca vanno su Las Palmas', async () => {
    jest
      .mocked(Location.getForegroundPermissionsAsync)
      .mockResolvedValue({ granted: true } as never);
    jest
      .mocked(Location.getCurrentPositionAsync)
      .mockResolvedValue({ coords: { latitude: 28.1277, longitude: -15.4177 } } as never);
    await renderApp('ready', '/map', { location_opt_in: true });
    await waitFor(() => expect(mapCityCalls().at(-1)).toBe('las-palmas'));
    await act(async () => router.push('/search'));
    await waitFor(() => expect(searchCityCalls()).toContain('las-palmas'));
    expect(searchCityCalls()).not.toContain('milano');
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  it('con la preferenza esplicita su Milano resta Milano anche se la cella è a Las Palmas', async () => {
    useMapStore.setState({ cityPreference: 'milano' });
    useCoarsePositionStore.setState({ cell: NEAR_LAS_PALMAS });
    await renderApp('ready', '/map');
    await waitFor(() => expect(mapCityCalls()).toContain('milano'));
    expect(mapCityCalls()).not.toContain('las-palmas');
  });

  it('con la posizione spenta usa la città del profilo (Milano)', async () => {
    await renderApp('ready', '/map');
    await waitFor(() => expect(mapCityCalls()).toContain('milano'));
    expect(mapCityCalls()).not.toContain('las-palmas');
  });

  it('quando arriva la cella la mappa si ricentra sulla città rilevata, senza chiedere permessi', async () => {
    await renderApp('ready', '/map', { location_opt_in: true });
    await waitFor(() => expect(mapLatitude()).toBeCloseTo(45.4642, 3));
    await act(async () => useCoarsePositionStore.setState({ cell: NEAR_LAS_PALMAS }));
    await waitFor(() => expect(mapLatitude()).toBeCloseTo(28.1235, 3));
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
  });

  describe('selettore nel profilo', () => {
    const AUTO = 'profile:city.auto';

    it('elenca Automatica e le città attive, con Automatica scelta di default', async () => {
      await renderApp('ready', '/profile');
      expect(await screen.findByRole('button', { name: AUTO })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Las Palmas' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'Milano' })).toBeOnTheScreen();
      expect(useMapStore.getState().cityPreference).toBe('auto');
    });

    it('con la posizione spenta spiega che si usa la città del profilo', async () => {
      await renderApp('ready', '/profile');
      expect(await screen.findByText('profile:city.autoOff({"city":"Milano"})')).toBeOnTheScreen();
    });

    it('con la posizione accesa non mostra la nota', async () => {
      await renderApp('ready', '/profile', { location_opt_in: true });
      await screen.findByRole('button', { name: AUTO });
      expect(screen.queryByText(/profile:city.autoOff/)).toBeNull();
    });

    it('scegliere una città la salva come preferenza e la mappa si ricentra lì', async () => {
      await renderApp('ready', '/profile');
      await fireEvent.press(await screen.findByRole('button', { name: 'Las Palmas' }));
      expect(useMapStore.getState().cityPreference).toBe('las-palmas');
      await act(async () => router.push('/map'));
      await waitFor(() => expect(mapLatitude()).toBeCloseTo(28.1235, 3));
      expect(mapCityCalls()).toContain('las-palmas');
    });

    it('tornare ad Automatica azzera la scelta', async () => {
      useMapStore.setState({ cityPreference: 'las-palmas' });
      await renderApp('ready', '/profile');
      await fireEvent.press(await screen.findByRole('button', { name: AUTO }));
      expect(useMapStore.getState().cityPreference).toBe('auto');
    });

    it('non chiede mai il permesso posizione', async () => {
      await renderApp('ready', '/profile');
      await fireEvent.press(await screen.findByRole('button', { name: 'Las Palmas' }));
      expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    });
  });
});
