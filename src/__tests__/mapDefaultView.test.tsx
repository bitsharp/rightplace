import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { useMapStore } from '@/features/map/store/mapStore';
import { useCoarsePositionStore } from '@/features/profile/location';
import { renderApp } from '@/test/appFlows';
import { setFakeRpc } from '@/test/fakeSupabase';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const CITIES = [
  { slug: 'milano', name: 'Milano', country: 'IT', lat: 45.4642, lng: 9.19, default_zoom: 13 },
];

describe('mappa all’avvio', () => {
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
    });
  });

  it('di default la mappa si apre su Mappe', async () => {
    await renderApp('ready', '/map');
    expect(await screen.findByRole('button', { name: 'map:view.general' })).toBeSelected();
  });

  it('con la preferenza Amici la mappa si apre su Amici', async () => {
    useMapStore.setState({ defaultView: 'friends', view: 'friends' });
    await renderApp('ready', '/map');
    expect(await screen.findByRole('button', { name: 'map:view.friends' })).toBeSelected();
  });

  it('la riga nelle impostazioni mostra il valore corrente e scegliere salva la preferenza', async () => {
    await renderApp('ready', '/profile/edit');
    expect(await screen.findByText('map:view.general')).toBeOnTheScreen();
    await fireEvent.press(await screen.findByText('profile:settings.rows.mapView'));
    await waitFor(() => expect(screen).toHavePathname('/profile/map-view'));
    await fireEvent.press(await screen.findByRole('button', { name: 'map:view.friends' }));
    expect(useMapStore.getState()).toMatchObject({ defaultView: 'friends', view: 'friends' });
  });

  it('il toggle sulla mappa non cambia la preferenza', async () => {
    await renderApp('ready', '/map');
    await fireEvent.press(await screen.findByRole('button', { name: 'map:view.friends' }));
    expect(useMapStore.getState()).toMatchObject({ view: 'friends', defaultView: 'general' });
  });
});
