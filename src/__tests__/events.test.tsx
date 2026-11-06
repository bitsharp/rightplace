import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';

import { useMapStore } from '@/features/map/store/mapStore';
import { renderApp } from '@/test/appFlows';
import { fakeSupabase, setFakeRpc, setFakeTable } from '@/test/fakeSupabase';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

// Friday 6 Nov 2026, 15:00 in Milan.
const NOW = new Date('2026-11-06T14:00:00Z');

const cityEvent = (overrides: Record<string, unknown> = {}) => ({
  event_id: 'e1',
  name: 'Notte Techno',
  venue_id: 'arena',
  venue_name: 'Arena Club',
  venue_kind: 'club',
  lat: 45.4642,
  lng: 9.19,
  starts_at: '2026-11-06T21:00:00Z',
  ends_at: '2026-11-07T03:00:00Z',
  going_band: '3–10',
  maybe_band: 'pochi',
  is_sponsored: false,
  timezone: 'Europe/Rome',
  ...overrides,
});

const tomorrowEvent = cityEvent({
  event_id: 'e2',
  name: 'Brunch Domani',
  starts_at: '2026-11-07T21:00:00Z',
  ends_at: '2026-11-08T03:00:00Z',
});

const detailRow = (overrides: Record<string, unknown> = {}) => ({
  event_id: 'e1',
  name: 'Notte Techno',
  description: 'Dj set tutta la notte',
  starts_at: '2026-11-06T21:00:00Z',
  ends_at: '2026-11-07T03:00:00Z',
  cancelled_at: null,
  target_age_bands: ['18-24', '25-34'],
  target_genders: ['female'],
  venue_id: 'arena',
  venue_name: 'Arena Club',
  venue_kind: 'club',
  address: null,
  lat: 45.4642,
  lng: 9.19,
  city_slug: 'milano',
  timezone: 'Europe/Rome',
  taxi_number: null,
  going_band: 'pochi',
  maybe_band: 'pochi',
  avg_age: null,
  female_pct: null,
  male_pct: null,
  other_pct: null,
  friends: [],
  is_mine: false,
  creator_handle: 'lince.rosso',
  ...overrides,
});

const VENUE_DETAIL = {
  venue_id: 'arena',
  name: 'Arena Club',
  kind: 'club',
  address: 'Via Test 1, Milano',
  opening_hours: null,
  google_place_id: 'ChIJabc',
  lat: 45.4642,
  lng: 9.19,
  city_slug: 'milano',
  city_name: 'Milano',
  country: 'IT',
  timezone: 'Europe/Rome',
  taxi_number: '+39 02 8585',
};

const VENUE_STATS = {
  going_band: 'pochi',
  maybe_band: 'pochi',
  avg_age: null,
  female_pct: null,
  male_pct: null,
  other_pct: null,
  friends: [],
  is_sponsored: false,
};

const hotSpotRow = {
  venue_id: 'arena',
  name: 'Arena Club',
  kind: 'club',
  lat: 45.4642,
  lng: 9.19,
  typical_level: 3,
  going_band: '10–20',
  maybe_band: 'pochi',
  is_hot_spot: true,
  is_sponsored: false,
  friends_going: null,
  friends_count: null,
};

const venueRow = (id: string, name: string, kind: string) => ({
  id,
  name,
  kind,
  address: null,
  google_place_id: `place-${id}`,
  is_active: true,
  cities: { slug: 'milano', name: 'Milano' },
});

const CITIES = [
  { slug: 'milano', name: 'Milano', country: 'IT', lat: 45.46, lng: 9.19, default_zoom: 13 },
];

type Backend = { events?: unknown[]; detail?: unknown; map?: unknown[] };

// Stand-in for the server: one active declaration and its chat room, like declare/get_my_chat_rooms.
function seedBackend({ events = [cityEvent()], detail = detailRow(), map = [] }: Backend = {}) {
  let declared: 'going' | 'maybe' | null = null;
  setFakeTable('venues', [
    venueRow('arena', 'Arena Club', 'club'),
    venueRow('bar', 'Bar Brera', 'bar'),
  ]);
  setFakeRpc({
    get_active_cities: CITIES,
    get_city_events: events,
    get_city_map: map,
    search_venues: [],
    get_event_detail: [detail],
    get_venue_detail: [VENUE_DETAIL],
    get_venue_stats: [VENUE_STATS],
    get_my_declaration: () =>
      declared
        ? [
            {
              declaration_id: 'd1',
              venue_id: 'arena',
              venue_name: 'Arena Club',
              event_id: 'e1',
              intent: declared,
              expires_at: '2026-11-07T03:00:00Z',
            },
          ]
        : [],
    get_my_chat_rooms: () =>
      declared
        ? [
            {
              room_id: 'r1',
              venue_id: 'arena',
              venue_name: 'Arena Club',
              event_id: 'e1',
              event_name: 'Notte Techno',
              expires_at: '2099-01-01T00:00:00Z',
              friends_inside: 0,
              photo_count: 0,
              last_kind: null,
              last_text: null,
              last_handle: null,
              last_at: null,
            },
          ]
        : [],
    declare: (args: unknown) => {
      declared = (args as { p_intent: 'going' | 'maybe' }).p_intent;
      return 'd1';
    },
    get_room_messages: [],
    get_post_target: [],
    get_story_posts: [],
    get_stories: [],
    get_recommended_venue: [],
  });
}

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  jest.setSystemTime(NOW);
  jest
    .mocked(Location.getForegroundPermissionsAsync)
    .mockResolvedValue({ granted: false } as never);
});
afterEach(() => jest.useRealTimers());

describe('serate nella ricerca', () => {
  it('mostra la sezione Serate con data/ora, locale e fasce', async () => {
    seedBackend({ events: [cityEvent(), tomorrowEvent] });
    await renderApp('ready', '/search');
    expect(await screen.findByText('venues:events.title')).toBeOnTheScreen();
    expect(
      screen.getByText('ui:eventWhen.tonight({"time":"22:00","endTime":"04:00"})'),
    ).toBeOnTheScreen();
    expect(
      screen.getByText('ui:eventWhen.tomorrow({"time":"22:00","endTime":"04:00"})'),
    ).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Notte Techno, Arena Club' })).toBeOnTheScreen();
    expect(screen.getAllByText('ui:intent.going 3–10')).toHaveLength(2);
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_city_events', {
      p_city_slug: 'milano',
      p_query: null,
    });
  });

  it('un tap porta alla serata', async () => {
    seedBackend();
    await renderApp('ready', '/search');
    await fireEvent.press(await screen.findByRole('button', { name: 'Notte Techno, Arena Club' }));
    expect(await screen.findByRole('header', { name: 'venue:eventTitle' })).toBeOnTheScreen();
    expect(await screen.findByText('Dj set tutta la notte')).toBeOnTheScreen();
  });

  it('il testo cercato filtra anche le serate, per nome e per locale', async () => {
    seedBackend({ events: [cityEvent(), tomorrowEvent] });
    await renderApp('ready', '/search');
    await screen.findByText('venues:events.title');
    await fireEvent.changeText(screen.getByLabelText('venues:searchLabel'), 'brunch');
    expect(screen.queryByRole('button', { name: 'Notte Techno, Arena Club' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Brunch Domani, Arena Club' })).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('venues:searchLabel'), 'zzz');
    expect(screen.queryByText('venues:events.title')).toBeNull();
  });

  it('il filtro per tipo di locale vale anche per le serate', async () => {
    seedBackend();
    await renderApp('ready', '/search');
    await screen.findByText('venues:events.title');
    await fireEvent.press(screen.getByRole('button', { name: 'venues:kind.rooftop' }));
    expect(screen.queryByText('venues:events.title')).toBeNull();
  });

  it('senza serate non c’è la sezione', async () => {
    seedBackend({ events: [] });
    await renderApp('ready', '/search');
    await screen.findByLabelText('venues:searchLabel');
    expect(screen.queryByText('venues:events.title')).toBeNull();
  });
});

describe('serate sulla mappa', () => {
  const marker = (id: string) =>
    screen.findByTestId(`marker-event-${id}`, { includeHiddenElements: true });

  it('le serate di stasera sono marker propri e un tap apre la serata', async () => {
    seedBackend({ events: [cityEvent(), tomorrowEvent] });
    await renderApp('ready', '/map');
    await fireEvent.press(await marker('e1'));
    expect(await screen.findByRole('header', { name: 'venue:eventTitle' })).toBeOnTheScreen();
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_city_events', {
      p_city_slug: 'milano',
      p_query: null,
      p_days: 1,
    });
  });

  it('quelle di domani non compaiono tra gli eventi di stasera', async () => {
    seedBackend({ events: [cityEvent(), tomorrowEvent] });
    await renderApp('ready', '/map');
    await marker('e1');
    expect(screen.queryByTestId('marker-event-e2', { includeHiddenElements: true })).toBeNull();
  });

  it('se il locale ha già un punto caldo la serata è spostata accanto', async () => {
    seedBackend({ map: [hotSpotRow] });
    await renderApp('ready', '/map');
    const spot = await marker('e1');
    expect(spot.props.coordinate).not.toEqual({ latitude: 45.4642, longitude: 9.19 });
    expect(
      screen.getByTestId('marker-hot-arena', { includeHiddenElements: true }),
    ).toBeOnTheScreen();
  });

  it('senza punto caldo sta sulla posizione del locale', async () => {
    seedBackend();
    await renderApp('ready', '/map');
    expect((await marker('e1')).props.coordinate).toEqual({ latitude: 45.4642, longitude: 9.19 });
  });

  it('nella mappa amici non si disegnano (non dicono dove vanno i tuoi amici)', async () => {
    useMapStore.setState({ view: 'friends' });
    seedBackend();
    await renderApp('ready', '/map');
    await screen.findByRole('button', { name: 'map:view.friends' });
    await waitFor(() => expect(rpcCalls('get_city_events').length).toBeGreaterThan(0));
    expect(screen.queryByTestId('marker-event-e1', { includeHiddenElements: true })).toBeNull();
  });
});

describe('dettaglio serata', () => {
  it('mostra nome, creator, quando, descrizione, target e fasce; il locale è sotto', async () => {
    seedBackend();
    await renderApp('ready', '/event/e1');
    expect(await screen.findByText('Notte Techno')).toBeOnTheScreen();
    expect(screen.getByText('event:by({"handle":"@lince.rosso"})')).toBeOnTheScreen();
    expect(
      screen.getByText('ui:eventWhen.tonight({"time":"22:00","endTime":"04:00"})'),
    ).toBeOnTheScreen();
    expect(screen.getByText('Dj set tutta la notte')).toBeOnTheScreen();
    expect(
      screen.getByText(
        'event:target({"target":"ui:target.age.18-24, ui:target.age.25-34 · ui:target.gender.female"})',
      ),
    ).toBeOnTheScreen();
    expect(screen.getByText('event:venueSection')).toBeOnTheScreen();
    expect(
      screen.getByRole('button', { name: 'event:openVenue({"venue":"Arena Club"})' }),
    ).toBeOnTheScreen();
  });

  it('a differenza del locale non ha i segmenti Ci vado / Forse / Tutti: un solo gruppo', async () => {
    seedBackend();
    await renderApp('ready', '/event/e1');
    expect(await screen.findByText('venue:who.hidden.all')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'venue:who.segment.maybe' })).toBeNull();
    expect(rpcCalls('get_venue_stats')).toHaveLength(0);
  });

  it('con 3 o più mostra età media e genere', async () => {
    seedBackend({
      detail: detailRow({
        going_band: '3–10',
        avg_age: 24,
        female_pct: 60,
        male_pct: 40,
        other_pct: 0,
      }),
    });
    await renderApp('ready', '/event/e1');
    expect(await screen.findByText('ui:age.years({"age":24})')).toBeOnTheScreen();
    expect(screen.getByTestId('gender-female')).toBeOnTheScreen();
  });

  it('elenca gli amici che ci vanno', async () => {
    seedBackend({
      detail: detailRow({
        friends: [{ handle: 'volpe.viola', age_band: '18-24', gender: 'female', intent: 'going' }],
      }),
    });
    await renderApp('ready', '/event/e1');
    expect(await screen.findByText('@volpe.viola')).toBeOnTheScreen();
  });

  it('il locale sotto apre il dettaglio del locale', async () => {
    seedBackend();
    await renderApp('ready', '/event/e1');
    await fireEvent.press(
      await screen.findByRole('button', { name: 'event:openVenue({"venue":"Arena Club"})' }),
    );
    expect(await screen.findByRole('header', { name: 'venue:title' })).toBeOnTheScreen();
  });

  it('propone Andare e tornare con i dati del locale', async () => {
    seedBackend();
    await renderApp('ready', '/event/e1');
    expect(await screen.findByText('venue:transport.badge.taxi')).toBeOnTheScreen();
  });

  it('si dichiara sull’evento (p_event_id) e poi compare la chat della serata', async () => {
    seedBackend();
    await renderApp('ready', '/event/e1');
    expect(screen.queryByText('chat:openFromVenue')).toBeNull();
    await fireEvent.press(await screen.findByRole('button', { name: 'venue:cta' }));
    expect(await screen.findAllByText('Notte Techno')).not.toHaveLength(0);
    await fireEvent.press(await screen.findByRole('button', { name: 'venue:declare.going' }));
    await waitFor(() =>
      expect(fakeSupabase.rpc).toHaveBeenCalledWith('declare', {
        p_intent: 'going',
        p_event_id: 'e1',
      }),
    );
    await fireEvent.press(await screen.findByText('chat:openFromVenue'));
    expect(
      await screen.findByRole('header', { name: 'chat:venueTitle({"venue":"Notte Techno"})' }),
    ).toBeOnTheScreen();
  });

  it('una serata annullata ha il banner e non si può dichiarare', async () => {
    seedBackend({ detail: detailRow({ cancelled_at: '2026-11-06T10:00:00Z' }) });
    await renderApp('ready', '/event/e1');
    expect(await screen.findByText('event:cancelledBanner')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'venue:cta' }));
    expect(screen.queryByRole('button', { name: 'venue:declare.going' })).toBeNull();
  });

  it('se la serata non esiste mostra l’errore ma resta la barra con indietro', async () => {
    seedBackend({ detail: undefined });
    setFakeRpc({ get_event_detail: [] });
    await renderApp('ready', '/event/missing');
    expect(await screen.findByText('event:loadError')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'venue:eventTitle' })).toBeOnTheScreen();
  });
});
