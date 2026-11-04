import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

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

const mapRow = (overrides: Record<string, unknown>) => ({
  venue_id: 'x',
  name: 'Locale',
  kind: 'club',
  lat: 45.46,
  lng: 9.19,
  typical_level: 0,
  going_band: 'pochi',
  maybe_band: 'pochi',
  is_hot_spot: false,
  is_sponsored: false,
  friends_going: null,
  friends_count: null,
  ...overrides,
});

const arena = mapRow({
  venue_id: 'arena',
  name: 'Arena Club',
  typical_level: 3,
  going_band: '3–10',
  is_hot_spot: true,
  is_sponsored: true,
});
const quiet = mapRow({ venue_id: 'quiet', name: 'Bar Quieto', kind: 'bar', typical_level: 2 });
const hidden = mapRow({ venue_id: 'hidden', name: 'Locale Fantasma', typical_level: 0 });
const friendArena = mapRow({
  ...arena,
  friends_going: ['volpe.viola', 'orso.grigio'],
  friends_count: 2,
});
const friendTerrace = mapRow({
  venue_id: 'terrace',
  name: 'Terrazza',
  kind: 'rooftop',
  friends_going: ['gatto.blu'],
  friends_count: 1,
});

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

const DECLARATION = [
  {
    declaration_id: 'd1',
    venue_id: 'arena',
    venue_name: 'Arena Club',
    event_id: null,
    intent: 'going',
    expires_at: '2026-11-05T05:00:00Z',
  },
];

function seedBackend(overrides: Record<string, unknown> = {}) {
  setFakeRpc({
    get_active_cities: CITIES,
    get_city_map: (args: unknown) =>
      (args as { p_view: string }).p_view === 'friends'
        ? [friendArena, friendTerrace]
        : [arena, quiet, hidden],
    get_my_declaration: [],
    get_stories: [],
    get_recommended_venue: [],
    ...overrides,
  });
}

const hotSpot = (venue: string, going: string) =>
  `ui:hotSpot.a11y({"venue":"${venue}","going":"${going}","maybe":"ui:band.few"})`;
const typicalDot = (venue: string, level: string) =>
  `ui:typical.a11y({"venue":"${venue}","level":"ui:typical.${level}"})`;

describe('mappa', () => {
  beforeEach(() => {
    useCoarsePositionStore.setState({ cell: null });
    jest
      .mocked(Location.getForegroundPermissionsAsync)
      .mockResolvedValue({ granted: false } as never);
    seedBackend();
  });

  describe('vista generale', () => {
    it('mostra il punto caldo con la sua fascia e il typical dot grigio, senza sommarli', async () => {
      await renderApp('ready', '/map');
      expect(
        await screen.findByRole('button', { name: hotSpot('Arena Club', '3–10') }),
      ).toBeOnTheScreen();
      expect(
        screen.getByRole('button', { name: typicalDot('Bar Quieto', 'lively') }),
      ).toBeOnTheScreen();
      expect(screen.queryByRole('button', { name: typicalDot('Arena Club', 'packed') })).toBeNull();
    });

    it('un locale con typical 0 e fascia non visibile non disegna nulla', async () => {
      await renderApp('ready', '/map');
      await screen.findByRole('button', { name: hotSpot('Arena Club', '3–10') });
      expect(screen.queryByRole('button', { name: /Locale Fantasma/ })).toBeNull();
    });

    it('chiede la mappa della città salvata nello store', async () => {
      useMapStore.setState({ citySlug: 'las-palmas' });
      await renderApp('ready', '/map');
      await waitFor(() =>
        expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_city_map', {
          p_city_slug: 'las-palmas',
          p_view: 'general',
        }),
      );
    });

    it('legenda con i due strati e hint della mappa generale', async () => {
      await renderApp('ready', '/map');
      expect(await screen.findByText('map:legend.tonight')).toBeOnTheScreen();
      expect(screen.getByText('map:legend.usually')).toBeOnTheScreen();
      expect(screen.getByText('map:hint.general')).toBeOnTheScreen();
    });
  });

  describe('vista amici', () => {
    async function openFriendsView() {
      await renderApp('ready', '/map');
      await screen.findByRole('button', { name: hotSpot('Arena Club', '3–10') });
      await fireEvent.press(screen.getByRole('button', { name: 'map:view.friends' }));
    }

    it('mostra solo i locali con amici, con il numero di amici sul punto caldo', async () => {
      await openFriendsView();
      expect(await screen.findByText('map:hint.friends')).toBeOnTheScreen();
      expect(
        await screen.findByRole('button', { name: hotSpot('Terrazza', 'ui:band.few') }),
      ).toBeOnTheScreen();
      expect(screen.getByText('2', { includeHiddenElements: true })).toBeOnTheScreen();
      expect(screen.getByText('1', { includeHiddenElements: true })).toBeOnTheScreen();
      expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_city_map', {
        p_city_slug: 'milano',
        p_view: 'friends',
      });
    });

    it('elenca "N amici · @handle" per ogni locale', async () => {
      await openFriendsView();
      expect(
        await screen.findByText('ui:friendsGoing({"count":2}) · @volpe.viola, @orso.grigio'),
      ).toBeOnTheScreen();
      expect(screen.getByText('ui:friendsGoing({"count":1}) · @gatto.blu')).toBeOnTheScreen();
    });

    it('i typical dot restano, ma non c’è più il punto caldo generale degli altri locali', async () => {
      await openFriendsView();
      await screen.findByText('map:hint.friends');
      expect(
        screen.getByRole('button', { name: typicalDot('Bar Quieto', 'lively') }),
      ).toBeOnTheScreen();
    });

    it('un tap su un locale della lista apre il dettaglio', async () => {
      await openFriendsView();
      await fireEvent.press(await screen.findByText('Terrazza'));
      expect(await screen.findByRole('header', { name: 'venue:title' })).toBeOnTheScreen();
    });

    it('ricorda la vista scelta', async () => {
      await openFriendsView();
      expect(useMapStore.getState().view).toBe('friends');
    });
  });

  describe('TopBar e dichiarazione', () => {
    it('mostra l’handle del profilo', async () => {
      await renderApp('ready', '/map');
      expect(await screen.findByText('@lince.rosso')).toBeOnTheScreen();
    });

    it('senza dichiarazione non c’è il "+" né la pillola', async () => {
      await renderApp('ready', '/map');
      await screen.findByRole('button', { name: hotSpot('Arena Club', '3–10') });
      expect(screen.queryByRole('button', { name: 'ui:topBar.post' })).toBeNull();
      expect(screen.queryByText(/map:pill/)).toBeNull();
    });

    it('con una dichiarazione compaiono il "+" e la pillola, e il "+" apre il post', async () => {
      seedBackend({ get_my_declaration: DECLARATION });
      await renderApp('ready', '/map');
      await fireEvent.press(await screen.findByRole('button', { name: 'ui:topBar.post' }));
      expect(await screen.findByText('feed:newPost')).toBeOnTheScreen();
    });

    it('la pillola apre il locale dichiarato', async () => {
      seedBackend({ get_my_declaration: DECLARATION });
      await renderApp('ready', '/map');
      await fireEvent.press(
        await screen.findByText(
          'map:pill.text({"venue":"Arena Club","intent":"ui:intent.goingAction"})',
        ),
      );
      expect(await screen.findByRole('header', { name: 'venue:title' })).toBeOnTheScreen();
    });

    it('la campanella ha il pallino solo se ci sono storie e porta al feed', async () => {
      await renderApp('ready', '/map');
      await screen.findByText('@lince.rosso');
      expect(screen.queryByTestId('news-dot')).toBeNull();
    });

    it('con storie: pallino sulla campanella, la tua storia e i seguiti nella barra', async () => {
      seedBackend({
        get_stories: [
          { user_id: 'u2', handle: 'volpe.viola', latest_post_at: '2026-11-04T09:00:00Z' },
        ],
      });
      await renderApp('ready', '/map');
      expect(await screen.findByTestId('news-dot')).toBeOnTheScreen();
      expect(screen.getByText('ui:topBar.myStory')).toBeOnTheScreen();
      expect(screen.getByText('volpe.viola')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'ui:topBar.news' }));
      expect(await screen.findByRole('header', { name: 'feed:title' })).toBeOnTheScreen();
    });
  });

  describe('card', () => {
    it('la card sponsorizzata è il primo locale sponsorizzato e apre il dettaglio', async () => {
      await renderApp('ready', '/map');
      await fireEvent.press(
        await screen.findByRole('button', { name: 'ui:labels.sponsored, Arena Club' }),
      );
      expect(await screen.findByRole('header', { name: 'venue:title' })).toBeOnTheScreen();
    });

    it('la card consigliata apre il dettaglio', async () => {
      seedBackend({
        get_recommended_venue: [
          { venue_id: 'sunset', name: 'Sunset Rooftop', kind: 'rooftop', reason: 'history' },
        ],
      });
      await renderApp('ready', '/map');
      await fireEvent.press(
        await screen.findByRole('button', { name: 'ui:labels.recommended, Sunset Rooftop' }),
      );
      expect(await screen.findByRole('header', { name: 'venue:title' })).toBeOnTheScreen();
    });
  });

  describe('banner', () => {
    it('con un punto caldo non c’è nessun banner', async () => {
      await renderApp('ready', '/map');
      await screen.findByRole('button', { name: hotSpot('Arena Club', '3–10') });
      expect(screen.queryByText(/map:banner/)).toBeNull();
    });

    it('solo typical dot: spiega che i punti grigi sono l’affluenza abituale', async () => {
      seedBackend({ get_city_map: [quiet] });
      await renderApp('ready', '/map');
      expect(await screen.findByText('map:banner.typicalOnly')).toBeOnTheScreen();
    });

    it('né punti caldi né typical dot: serata tranquilla', async () => {
      seedBackend({ get_city_map: [hidden] });
      await renderApp('ready', '/map');
      expect(await screen.findByText('map:banner.empty')).toBeOnTheScreen();
    });
  });

  describe('marker "Tu" e permessi', () => {
    it('senza posizione attiva il "Tu" non c’è e la mappa non tocca i permessi', async () => {
      await renderApp('ready', '/map');
      await screen.findByRole('button', { name: hotSpot('Arena Club', '3–10') });
      expect(screen.queryByTestId('marker-you', { includeHiddenElements: true })).toBeNull();
      expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
      expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
    });

    it('con posizione attiva il "Tu" sta sulla cella da ~500 m, non sul punto esatto', async () => {
      jest
        .mocked(Location.getForegroundPermissionsAsync)
        .mockResolvedValue({ granted: true } as never);
      jest
        .mocked(Location.getCurrentPositionAsync)
        .mockResolvedValue({ coords: { latitude: 45.4641, longitude: 9.1901 } } as never);
      await renderApp('ready', '/map', { location_opt_in: true });
      const you = await screen.findByTestId('marker-you', { includeHiddenElements: true });
      expect(you.props.coordinate).toEqual({ latitude: 45.4625, longitude: 9.1925 });
      expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    });

    it('con il toggle acceso ma senza cella il "Tu" non compare', async () => {
      await renderApp('ready', '/map', { location_opt_in: true });
      await screen.findByRole('button', { name: hotSpot('Arena Club', '3–10') });
      expect(screen.queryByTestId('marker-you', { includeHiddenElements: true })).toBeNull();
    });
  });
});
