import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { SPOT_LONG_PRESS_MS } from '@/features/spots/domain/longPress';
import { renderApp } from '@/test/appFlows';
import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const CITIES = [
  { slug: 'milano', name: 'Milano', country: 'IT', lat: 45.4642, lng: 9.19, default_zoom: 13 },
];

const spotRow = (overrides: Record<string, unknown> = {}) => ({
  venue_id: 'spot-1',
  name: 'Casa di Anna',
  kind: 'spot',
  lat: 45.47,
  lng: 9.2,
  typical_level: 0,
  going_band: null,
  maybe_band: null,
  is_hot_spot: false,
  is_sponsored: false,
  friends_going: null,
  friends_going_ids: null,
  friends_count: null,
  is_spot: true,
  is_declarable: true,
  ...overrides,
});

function seed(mapRows: unknown[] = [], overrides: Record<string, unknown> = {}) {
  setFakeRpc({
    get_active_cities: CITIES,
    get_city_map: mapRows,
    get_my_declaration: [],
    get_post_target: [],
    get_story_posts: [],
    get_stories: [],
    get_recommended_venue: [],
    get_city_events: [],
    declare_at_spot: [{ venue_id: 'spot-new', declaration_id: 'd1' }],
    ...overrides,
  });
}

const declareCalls = () =>
  fakeSupabase.rpc.mock.calls.filter(([name]) => name === 'declare_at_spot');

// What the finger does on the map: still for the full press, then lifted. The mocked MapView maps (x, y) to (9 + x/1000, 45 + y/1000).
async function longPressMap(x = 200, y = 300) {
  const surface = await screen.findByTestId('map-press-surface', { includeHiddenElements: true });
  const touch = { nativeEvent: { pageX: x, pageY: y, touches: [{}] } };
  // renderRouter installs Jest fake timers: the 3 s of the press pass by advancing them.
  await act(async () => fireEvent(surface, 'touchStart', touch));
  await act(async () => void jest.advanceTimersByTime(SPOT_LONG_PRESS_MS + 100));
  await act(async () => fireEvent(surface, 'touchEnd'));
}

describe('spot dichiarabili sulla mappa', () => {
  beforeEach(() => {
    jest
      .mocked(Location.getForegroundPermissionsAsync)
      .mockResolvedValue({ granted: false } as never);
  });

  describe('serata in un punto qualsiasi', () => {
    beforeEach(() => {
      seed();
    });

    it('pressione lunga di 3 s → sheet → nome + SI → declare_at_spot col punto premuto', async () => {
      await renderApp('ready', '/map');
      await longPressMap();
      expect(await screen.findByText('spots:sheet.title')).toBeOnTheScreen();
      expect(screen.getByText('spots:sheet.visibility')).toBeOnTheScreen();

      await fireEvent.changeText(screen.getByLabelText('spots:sheet.nameLabel'), 'Casa di Anna');
      await fireEvent.press(screen.getByRole('button', { name: 'spots:sheet.going' }));

      await waitFor(() => expect(declareCalls()).toHaveLength(1));
      expect(declareCalls()[0]?.[1]).toEqual({
        p_lat: 45.3,
        p_lng: 9.2,
        p_name: 'Casa di Anna',
        p_intent: 'going',
      });
      await waitFor(() => expect(screen.queryByText('spots:sheet.title')).toBeNull());
    });

    it('dopo la creazione ricarica mappa e dichiarazione: lo spot appare "Ci vai"', async () => {
      await renderApp('ready', '/map');
      const before = fakeSupabase.rpc.mock.calls.filter(([n]) => n === 'get_city_map').length;
      await longPressMap();
      await fireEvent.changeText(
        await screen.findByLabelText('spots:sheet.nameLabel'),
        'Casa di Anna',
      );
      await fireEvent.press(screen.getByRole('button', { name: 'spots:sheet.maybe' }));
      await waitFor(() =>
        expect(
          fakeSupabase.rpc.mock.calls.filter(([n]) => n === 'get_city_map').length,
        ).toBeGreaterThan(before),
      );
      expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_my_declaration', undefined);
    });

    it('un nome non valido non arriva al server', async () => {
      await renderApp('ready', '/map');
      await longPressMap();
      await fireEvent.changeText(await screen.findByLabelText('spots:sheet.nameLabel'), 'x');
      await fireEvent.press(screen.getByRole('button', { name: 'spots:sheet.going' }));
      expect(await screen.findByText('spots:nameError.tooShort')).toBeOnTheScreen();
      expect(declareCalls()).toHaveLength(0);
    });

    it("un secondo spot nella stessa notte mostra l'errore SPOT_LIMIT", async () => {
      fakeSupabase.rpc.mockImplementation(async (name: string) => {
        if (name === 'declare_at_spot') return { data: null, error: { message: 'SPOT_LIMIT' } };
        if (name === 'get_active_cities') return { data: CITIES, error: null };
        return { data: [], error: null };
      });
      await renderApp('ready', '/map');
      await longPressMap();
      await fireEvent.changeText(
        await screen.findByLabelText('spots:sheet.nameLabel'),
        'Altro posto',
      );
      await fireEvent.press(screen.getByRole('button', { name: 'spots:sheet.going' }));
      expect(await screen.findByText('errors:rpc.SPOT_LIMIT')).toBeOnTheScreen();
      expect(screen.getByText('spots:sheet.title')).toBeOnTheScreen();
    });

    it('un rilascio prima dei 3 secondi non apre nulla', async () => {
      await renderApp('ready', '/map');
      const surface = await screen.findByTestId('map-press-surface', {
        includeHiddenElements: true,
      });
      await act(async () =>
        fireEvent(surface, 'touchStart', { nativeEvent: { pageX: 1, pageY: 1, touches: [{}] } }),
      );
      await act(async () => void jest.advanceTimersByTime(1500));
      await act(async () => fireEvent(surface, 'touchEnd'));
      expect(screen.queryByText('spots:sheet.title')).toBeNull();
    });
  });

  describe('spot degli altri', () => {
    it('sotto k: marker SPOT col nome e nessun numero, nemmeno "pochi"', async () => {
      seed([spotRow()]);
      await renderApp('ready', '/map');
      expect(
        await screen.findByRole('button', { name: 'map:spot.a11y({"name":"Casa di Anna"})' }),
      ).toBeOnTheScreen();
      expect(screen.getByText('map:spot.label')).toBeOnTheScreen();
      expect(screen.queryByText('ui:band.few')).toBeNull();
      expect(screen.queryByTestId(/^marker-hot-/, { includeHiddenElements: true })).toBeNull();
    });

    it('a 3 dichiarazioni diventa un punto caldo normale con la fascia 3–10', async () => {
      seed([spotRow({ going_band: '3–10', maybe_band: 'pochi', is_hot_spot: true })]);
      await renderApp('ready', '/map');
      await screen.findByTestId('marker-hot-spot-1', { includeHiddenElements: true });
      expect(screen.queryByText('map:spot.label')).toBeNull();
      expect(screen.getByText('3–10')).toBeOnTheScreen();
    });

    it('un tap sullo spot apre la sua scheda', async () => {
      seed([spotRow()], {
        get_venue_detail: [
          {
            venue_id: 'spot-1',
            name: 'Casa di Anna',
            kind: 'spot',
            address: null,
            opening_hours: null,
            google_place_id: 'spot:3f1c8a52-7d0e-4a56-9b1f-2c6d8e4a1b90',
            lat: 45.47,
            lng: 9.2,
            city_slug: 'milano',
            city_name: 'Milano',
            country: 'IT',
            timezone: 'Europe/Rome',
            taxi_number: null,
          },
        ],
        get_venue_stats: [
          {
            going_band: null,
            maybe_band: null,
            avg_age: null,
            female_pct: null,
            male_pct: null,
            friends: [],
            is_sponsored: false,
          },
        ],
      });
      await renderApp('ready', '/map');
      await fireEvent.press(
        await screen.findByRole('button', { name: 'map:spot.a11y({"name":"Casa di Anna"})' }),
      );
      expect(await screen.findByText('venue:spot.belowK')).toBeOnTheScreen();
    });

    it('la legenda a schermo intero elenca la voce Spot', async () => {
      seed([spotRow()]);
      await renderApp('ready', '/map');
      await fireEvent.press(await screen.findByRole('button', { name: 'map:fullscreen.open' }));
      expect(screen.getByText('map:legend.spot')).toBeOnTheScreen();
    });
  });
});
