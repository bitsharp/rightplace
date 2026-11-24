import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

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
  friends_going_ids: null,
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
  friends_going_ids: ['u-volpe', 'u-orso'],
  friends_count: 2,
});
const friendTerrace = mapRow({
  venue_id: 'terrace',
  name: 'Terrazza',
  kind: 'rooftop',
  friends_going: ['gatto.blu'],
  friends_going_ids: ['u-gatto'],
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

const POST_TARGET = [
  {
    night_id: 'n1',
    event_id: null,
    venue_name: 'Arena Club',
    night_date: '2026-11-04',
    room_id: null,
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
    get_post_target: [],
    get_story_posts: [],
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
  afterEach(() => jest.restoreAllMocks());

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

    it('con 3 righe is_hot_spot dal server disegna 3 punti caldi (dati demo di Milano)', async () => {
      seedBackend({
        get_city_map: [
          mapRow({ venue_id: 'h1', name: 'Uno', going_band: '3–10', is_hot_spot: true }),
          mapRow({ venue_id: 'h2', name: 'Due', going_band: '10–20', is_hot_spot: true }),
          mapRow({ venue_id: 'h3', name: 'Tre', going_band: '3–10', is_hot_spot: true }),
        ],
      });
      await renderApp('ready', '/map');
      await screen.findByRole('button', { name: hotSpot('Uno', '3–10') });
      expect(screen.getAllByTestId(/^marker-hot-/, { includeHiddenElements: true })).toHaveLength(
        3,
      );
    });

    it('un locale con typical 0 e fascia non visibile non disegna nulla', async () => {
      await renderApp('ready', '/map');
      await screen.findByRole('button', { name: hotSpot('Arena Club', '3–10') });
      expect(screen.queryByRole('button', { name: /Locale Fantasma/ })).toBeNull();
    });

    it('chiede la mappa della città scelta nello store', async () => {
      useMapStore.setState({ cityPreference: 'las-palmas' });
      await renderApp('ready', '/map');
      await waitFor(() =>
        expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_city_map', {
          p_city_slug: 'las-palmas',
          p_view: 'general',
        }),
      );
    });

    it('nella vista compatta non ci sono scritte sovrapposte alla mappa', async () => {
      await renderApp('ready', '/map');
      await screen.findByRole('button', { name: hotSpot('Arena Club', '3–10') });
      expect(screen.queryByText('map:hint.general')).toBeNull();
      expect(screen.queryByText('map:legend.tonight')).toBeNull();
    });

    it('a schermo intero compaiono hint e legenda con i due strati, e si richiude', async () => {
      await renderApp('ready', '/map');
      await fireEvent.press(await screen.findByRole('button', { name: 'map:fullscreen.open' }));
      expect(screen.getByText('map:hint.general')).toBeOnTheScreen();
      expect(screen.getByText('map:legend.tonight')).toBeOnTheScreen();
      expect(screen.getByText('map:legend.usually')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'map:fullscreen.close' }));
      expect(screen.queryByText('map:hint.general')).toBeNull();
    });

    it('a schermo intero il selettore cambia la vista (stesso store) e un tap sul marker apre il locale', async () => {
      // Android: no onDismiss, the venue opens right after the map closes.
      jest.replaceProperty(Platform, 'OS', 'android');
      await renderApp('ready', '/map');
      await fireEvent.press(await screen.findByRole('button', { name: 'map:fullscreen.open' }));
      await fireEvent.press(screen.getAllByRole('button', { name: 'map:view.friends' })[1]!);
      expect(useMapStore.getState().view).toBe('friends');
      expect(await screen.findByText('map:hint.friends')).toBeOnTheScreen();
      await fireEvent.press(
        (await screen.findAllByTestId('marker-hot-terrace', { includeHiddenElements: true }))[0]!,
      );
      expect(await screen.findByRole('header', { name: 'venue:title' })).toBeOnTheScreen();
      expect(screen.queryByText('map:hint.friends')).toBeNull();
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
      await screen.findByRole('button', { name: hotSpot('Terrazza', 'ui:band.few') });
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

  describe('foto degli amici', () => {
    // Like the Edge Function: only the ids in `visible` come back signed.
    const signAvatars = (visible: string[]) =>
      fakeSupabase.functions.invoke.mockImplementation(async (name: string, options?: unknown) => {
        if (name !== 'avatar-urls') return { data: null, error: null };
        const ids = (options as { body: { userIds: string[] } }).body.userIds;
        const urls = ids
          .filter((id) => visible.includes(id))
          .map((userId) => ({ userId, url: `https://signed.test/a/${userId}` }));
        return { data: { urls }, error: null };
      });
    const avatarCalls = () =>
      fakeSupabase.functions.invoke.mock.calls.filter(([name]) => name === 'avatar-urls');

    it('nella mappa amici: foto per chi il server firma, iniziale per gli altri, una sola richiesta', async () => {
      signAvatars(['u-volpe']);
      await renderApp('ready', '/map');
      await screen.findByRole('button', { name: hotSpot('Arena Club', '3–10') });
      await fireEvent.press(screen.getByRole('button', { name: 'map:view.friends' }));
      await screen.findByText('ui:friendsGoing({"count":2}) · @volpe.viola, @orso.grigio');
      // the marker of the venue and its row in the list
      await waitFor(() =>
        expect(screen.getAllByTestId('avatar-image', { includeHiddenElements: true })).toHaveLength(
          2,
        ),
      );
      expect(screen.getAllByText('O', { includeHiddenElements: true }).length).toBeGreaterThan(0);
      const withFriends = avatarCalls().filter(([, options]) =>
        (options as { body: { userIds: string[] } }).body.userIds.includes('u-volpe'),
      );
      expect(withFriends).toHaveLength(1);
      expect(withFriends[0]?.[1]).toEqual({
        // my own photo was already asked for with the top bar: nobody is requested twice
        body: { userIds: ['u-gatto', 'u-orso', 'u-volpe'] },
      });
    });

    it('nella mappa generale non compare nessun volto e nessuna richiesta di foto di amici', async () => {
      signAvatars(['u-volpe', 'u-orso', 'u-gatto']);
      await renderApp('ready', '/map');
      await screen.findByRole('button', { name: hotSpot('Arena Club', '3–10') });
      expect(screen.queryByTestId('friend-faces', { includeHiddenElements: true })).toBeNull();
      expect(screen.queryByTestId('avatar-image', { includeHiddenElements: true })).toBeNull();
      const friendIds = ['u-volpe', 'u-orso', 'u-gatto'];
      const asked = avatarCalls().flatMap(
        ([, options]) => (options as { body: { userIds: string[] } }).body.userIds,
      );
      expect(asked.filter((id) => friendIds.includes(id))).toEqual([]);
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
      seedBackend({ get_my_declaration: DECLARATION, get_post_target: POST_TARGET });
      await renderApp('ready', '/map');
      await fireEvent.press(await screen.findByRole('button', { name: 'ui:topBar.post' }));
      expect(await screen.findByRole('header', { name: 'post:title' })).toBeOnTheScreen();
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

    it('la campanella ha il pallino solo se ci sono novità e porta a "Novità"', async () => {
      await renderApp('ready', '/map');
      await screen.findByText('@lince.rosso');
      expect(screen.queryByTestId('news-dot')).toBeNull();
    });

    it('con storie: pallino sulla campanella e i seguiti nella barra, senza "La tua storia"', async () => {
      seedBackend({
        get_stories: [
          { user_id: 'u2', handle: 'volpe.viola', latest_post_at: '2026-11-04T09:00:00Z' },
        ],
      });
      await renderApp('ready', '/map');
      expect(await screen.findByTestId('news-dot')).toBeOnTheScreen();
      expect(screen.queryByText('ui:topBar.myStory')).toBeNull();
      expect(screen.getByText('volpe.viola')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'ui:topBar.news' }));
      expect(
        await screen.findByRole('header', { name: 'notifications:activity.title' }),
      ).toBeOnTheScreen();
    });

    it('"La tua storia" compare quando ho un post delle ultime 24 ore', async () => {
      seedBackend({
        get_story_posts: [
          {
            post_id: 'm1',
            author_id: 'user-1',
            author_handle: 'lince.rosso',
            venue_name: 'Arena Club',
            night_date: '2026-11-04',
            caption: 'io',
            has_photo: false,
            visible_from: '2026-11-05T05:00:00Z',
            expires_at: '2026-11-12T05:00:00Z',
            like_count: 0,
            comment_count: 0,
            liked_by_me: false,
            is_mine: true,
          },
        ],
      });
      await renderApp('ready', '/map');
      expect(await screen.findByText('ui:topBar.myStory')).toBeOnTheScreen();
    });
  });

  describe('la mia serata di stasera', () => {
    const declarationAt = (venueId: string, venueName: string, intent = 'going') => [
      { ...DECLARATION[0], venue_id: venueId, venue_name: venueName, intent },
    ];
    const venueDetail = (venueId: string) => [
      {
        venue_id: venueId,
        name: 'Locale Lontano',
        kind: 'club',
        address: null,
        opening_hours: null,
        google_place_id: 'p1',
        lat: 45.5,
        lng: 9.25,
        city_slug: 'milano',
        city_name: 'Milano',
        country: 'IT',
        timezone: 'Europe/Rome',
        taxi_number: null,
      },
    ];
    const ownMarker = () => screen.findByTestId('marker-own', { includeHiddenElements: true });
    const ownCard = (venue: string, intent: 'going' | 'maybe') =>
      `map:cards.own.a11y({"venue":"${venue}","intent":"map:own.${intent}"})`;

    it('un locale senza affluenza né typical (fuori dai punti caldi) è marcato "Ci vai"', async () => {
      seedBackend({ get_my_declaration: declarationAt('hidden', 'Locale Fantasma') });
      await renderApp('ready', '/map');
      const marker = await ownMarker();
      expect(marker.props.coordinate).toEqual({ latitude: 45.46, longitude: 9.19 });
      expect(
        within(marker).getByText('map:own.going', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
      expect(screen.queryByTestId('marker-hot-hidden', { includeHiddenElements: true })).toBeNull();
    });

    it('un locale assente dalle righe di get_city_map prende le coordinate dal dettaglio locale', async () => {
      seedBackend({
        get_my_declaration: declarationAt('lontano', 'Locale Lontano', 'maybe'),
        get_venue_detail: venueDetail('lontano'),
      });
      await renderApp('ready', '/map');
      const marker = await ownMarker();
      expect(marker.props.coordinate).toEqual({ latitude: 45.5, longitude: 9.25 });
      expect(
        within(marker).getByText('map:own.maybe', { includeHiddenElements: true }),
      ).toBeOnTheScreen();
    });

    it('resta visibile passando alla vista amici', async () => {
      seedBackend({ get_my_declaration: declarationAt('hidden', 'Locale Fantasma') });
      await renderApp('ready', '/map');
      await ownMarker();
      await fireEvent.press(screen.getByRole('button', { name: 'map:view.friends' }));
      await screen.findByRole('button', { name: hotSpot('Terrazza', 'ui:band.few') });
      expect(await ownMarker()).toBeOnTheScreen();
    });

    it('senza dichiarazione non compare né il marker né la card', async () => {
      await renderApp('ready', '/map');
      await screen.findByRole('button', { name: hotSpot('Arena Club', '3–10') });
      expect(screen.queryByTestId('marker-own', { includeHiddenElements: true })).toBeNull();
      expect(screen.queryByText('map:cards.own.label')).toBeNull();
    });

    it('la card in basso è la prima e porta al locale dichiarato', async () => {
      seedBackend({ get_my_declaration: declarationAt('arena', 'Arena Club') });
      await renderApp('ready', '/map');
      const own = await screen.findByRole('button', { name: ownCard('Arena Club', 'going') });
      const sponsored = screen.getByRole('button', { name: 'ui:labels.sponsored, Arena Club' });
      const order = screen.getAllByRole('button').map((button) => button.props.accessibilityLabel);
      expect(order.indexOf(own.props.accessibilityLabel)).toBeLessThan(
        order.indexOf(sponsored.props.accessibilityLabel),
      );
      await fireEvent.press(own);
      expect(await screen.findByRole('header', { name: 'venue:title' })).toBeOnTheScreen();
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

  describe('titolo, barra in basso e card del locale (restyle 22)', () => {
    const tocqueville = mapRow({
      venue_id: 'tocq',
      name: 'Tocqueville',
      going_band: '20–30',
      maybe_band: '10–20',
      is_hot_spot: true,
      // Anche se il server mandasse amici sulla riga generale, la mappa generale non disegna volti.
      friends_going: ['volpe.viola'],
      friends_going_ids: ['u-volpe'],
      friends_count: 1,
    });
    const DETAIL = [
      {
        venue_id: 'tocq',
        name: 'Tocqueville',
        kind: 'club',
        address: 'Via Tocqueville 13',
        opening_hours: null,
        google_place_id: 'p1',
        lat: 45.4642,
        lng: 9.19,
        city_slug: 'milano',
        city_name: 'Milano',
        country: 'IT',
        timezone: 'Europe/Rome',
        taxi_number: null,
        photo_url: 'https://img.example/tocq.jpg',
      },
    ];
    const withTocqueville = () =>
      seedBackend({
        get_city_map: [arena, tocqueville],
        get_venue_detail: DETAIL,
      });

    it('scrive "STASERA {città}" con la città della mappa e il sottotitolo', async () => {
      await renderApp('ready', '/map');
      expect(await screen.findByText(/map:header\.title/)).toBeOnTheScreen();
      expect(screen.getByTestId('map-title-city')).toHaveTextContent('Milano');
      expect(screen.getByText('map:header.subtitle')).toBeOnTheScreen();
    });

    it('l’icona dei filtri apre la ricerca: la mappa non ha filtri propri', async () => {
      await renderApp('ready', '/map');
      await fireEvent.press(await screen.findByRole('button', { name: 'map:header.filters' }));
      expect(await screen.findByLabelText('venues:searchLabel')).toBeOnTheScreen();
    });

    it('la card del locale scrive la fascia e mai un numero esatto, con la foto di copertina', async () => {
      withTocqueville();
      await renderApp('ready', '/map');
      const card = await screen.findByRole('button', {
        name: 'map:card.a11y({"venue":"Tocqueville","band":"20–30 ui:people"})',
      });
      expect(within(card).getByText('20–30 ui:people')).toBeOnTheScreen();
      expect(await screen.findByTestId('featured-venue-photo')).toBeOnTheScreen();
      expect(within(card).queryByText(/km/)).toBeNull();
    });

    it('sotto la soglia la card scrive "pochi" e nessuna cifra', async () => {
      seedBackend({
        get_city_map: [
          mapRow({
            venue_id: 'few',
            name: 'Piccolo',
            going_band: 'pochi',
            is_hot_spot: true,
          }),
        ],
        get_venue_detail: [],
      });
      await renderApp('ready', '/map');
      const card = await screen.findByRole('button', {
        name: 'map:card.a11y({"venue":"Piccolo","band":"ui:band.few"})',
      });
      expect(within(card).getByText('ui:band.few')).toBeOnTheScreen();
      expect(within(card).queryByText(/\d/)).toBeNull();
    });

    it('la card apre il dettaglio del locale', async () => {
      withTocqueville();
      await renderApp('ready', '/map');
      await fireEvent.press(
        await screen.findByRole('button', {
          name: 'map:card.a11y({"venue":"Tocqueville","band":"20–30 ui:people"})',
        }),
      );
      expect(await screen.findByRole('header', { name: 'venue:title' })).toBeOnTheScreen();
    });

    it('nella mappa generale nessun volto, nemmeno con amici sulla riga', async () => {
      withTocqueville();
      await renderApp('ready', '/map');
      await screen.findByTestId('marker-hot-tocq', { includeHiddenElements: true });
      expect(screen.queryByTestId('friend-faces', { includeHiddenElements: true })).toBeNull();
    });

    it('senza posizione: barra con la città, niente "vai alla mia posizione", niente distanza, niente permessi', async () => {
      withTocqueville();
      await renderApp('ready', '/map');
      const bar = await screen.findByRole('button', { name: 'map:searchPlaceholder' });
      expect(within(bar).getByText('Milano')).toBeOnTheScreen();
      await screen.findByTestId('marker-hot-tocq', { includeHiddenElements: true });
      expect(screen.queryByRole('button', { name: 'map:locate' })).toBeNull();
      expect(screen.queryByText(/map:card\.distance/)).toBeNull();
      expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    });

    it('con la posizione attiva compaiono il bottone "vai alla mia posizione" e la distanza dalla cella', async () => {
      jest
        .mocked(Location.getForegroundPermissionsAsync)
        .mockResolvedValue({ granted: true } as never);
      jest
        .mocked(Location.getCurrentPositionAsync)
        .mockResolvedValue({ coords: { latitude: 45.4641, longitude: 9.1901 } } as never);
      withTocqueville();
      await renderApp('ready', '/map', { location_opt_in: true });
      expect(await screen.findByRole('button', { name: 'map:locate' })).toBeOnTheScreen();
      expect(await screen.findByText(/map:card\.distance/)).toBeOnTheScreen();
      expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
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
