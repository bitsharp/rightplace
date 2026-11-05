import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { Linking } from 'react-native';

import { renderApp } from '@/test/appFlows';
import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const DETAIL = {
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

const HIDDEN = { avg_age: null, female_pct: null, male_pct: null };
const SHOWN = { avg_age: 23, female_pct: 52, male_pct: 48 };

const stats = (overrides: Record<string, unknown> = {}) => ({
  going_band: 'pochi',
  maybe_band: 'pochi',
  ...HIDDEN,
  other_pct: null,
  friends: [],
  is_sponsored: false,
  ...overrides,
});

const mapRow = {
  venue_id: 'arena',
  name: 'Arena Club',
  kind: 'club',
  lat: 45.46,
  lng: 9.19,
  typical_level: 3,
  going_band: '3–10',
  maybe_band: 'pochi',
  is_hot_spot: true,
  is_sponsored: false,
  friends_going: null,
  friends_count: null,
};

const declarationRow = (intent: 'going' | 'maybe') => ({
  declaration_id: 'd1',
  venue_id: 'arena',
  venue_name: 'Arena Club',
  event_id: null,
  intent,
  expires_at: '2026-11-07T04:00:00Z',
});

// Stand-in for the server: remembers the one active declaration, like get_my_declaration/declare.
function seedBackend(
  options: { stats?: (segment: string) => unknown; mine?: 'going' | 'maybe' } = {},
) {
  let mine: ReturnType<typeof declarationRow> | null = options.mine
    ? declarationRow(options.mine)
    : null;
  setFakeRpc({
    get_venue_detail: [DETAIL],
    get_venue_stats: (args: unknown) => [
      options.stats?.((args as { p_segment: string }).p_segment) ?? stats(),
    ],
    get_my_declaration: () => (mine ? [mine] : []),
    declare: (args: unknown) => {
      mine = declarationRow((args as { p_intent: 'going' | 'maybe' }).p_intent);
      return 'd1';
    },
    undeclare: () => {
      mine = null;
      return null;
    },
    get_active_cities: [
      { slug: 'milano', name: 'Milano', country: 'IT', lat: 45.46, lng: 9.19, default_zoom: 13 },
    ],
    get_city_map: [mapRow],
    get_stories: [],
    get_recommended_venue: [],
  });
}

const pillName = (intent: 'goingAction' | 'maybeAction') =>
  `map:pill.a11y({"venue":"Arena Club","intent":"ui:intent.${intent}"})`;

describe('dettaglio locale e dichiarazione', () => {
  beforeEach(() => {
    jest
      .mocked(Location.getForegroundPermissionsAsync)
      .mockResolvedValue({ granted: false } as never);
  });
  afterEach(() => jest.restoreAllMocks());

  describe('statistiche k-anonime', () => {
    it('con 2 dichiarati: fascia "pochi" e statistiche nascoste', async () => {
      seedBackend();
      await renderApp('ready', '/venue/arena');
      expect(await screen.findByText('venue:who.hidden.going')).toBeOnTheScreen();
      expect(screen.getAllByText('ui:band.few')).toHaveLength(2);
      expect(screen.queryByText(/ui:age.years/)).toBeNull();
    });

    it('con 3 dichiarati: fascia "3–10", età media e genere visibili', async () => {
      seedBackend({ stats: () => stats({ going_band: '3–10', ...SHOWN }) });
      await renderApp('ready', '/venue/arena');
      expect(await screen.findByText('ui:age.years({"age":23})')).toBeOnTheScreen();
      expect(screen.getByText('3–10')).toBeOnTheScreen();
      expect(screen.getByTestId('gender-female')).toBeOnTheScreen();
    });

    it('il segmento Forse resta nascosto anche se i "Ci vado" sono visibili', async () => {
      seedBackend({
        stats: (segment) =>
          stats({
            going_band: '10–20',
            maybe_band: 'pochi',
            ...(segment === 'maybe' ? HIDDEN : SHOWN),
          }),
      });
      await renderApp('ready', '/venue/arena');
      expect(await screen.findByText('ui:age.years({"age":23})')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'venue:who.segment.maybe' }));
      expect(await screen.findByText('venue:who.hidden.maybe')).toBeOnTheScreen();
      expect(screen.queryByText(/ui:age.years/)).toBeNull();
      expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_venue_stats', {
        p_venue_id: 'arena',
        p_segment: 'maybe',
      });
    });

    it('elenca gli amici che ci vanno', async () => {
      seedBackend({
        stats: () =>
          stats({
            friends: [
              { handle: 'volpe.viola', age_band: '18-24', gender: 'female', intent: 'going' },
            ],
          }),
      });
      await renderApp('ready', '/venue/arena');
      expect(await screen.findByText('@volpe.viola')).toBeOnTheScreen();
    });
  });

  describe('andare e tornare', () => {
    it('Uber apre il link di andata e, dopo il cambio, quello di ritorno', async () => {
      seedBackend();
      const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
      await renderApp('ready', '/venue/arena');
      await fireEvent.press(await screen.findByText('venue:transport.badge.uber'));
      expect(open).toHaveBeenLastCalledWith(expect.stringContaining('pickup=my_location'));
      await fireEvent.press(screen.getByRole('button', { name: 'venue:transport.back' }));
      await fireEvent.press(screen.getByText('venue:transport.badge.uber'));
      expect(open).toHaveBeenLastCalledWith(expect.stringContaining('pickup[latitude]=45.4642'));
    });

    it('il taxi chiama il numero della città', async () => {
      seedBackend();
      const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(undefined);
      await renderApp('ready', '/venue/arena');
      await fireEvent.press(await screen.findByText('venue:transport.badge.taxi'));
      expect(open).toHaveBeenCalledWith('tel:+39028585');
    });
  });

  describe('dichiarazione', () => {
    it('dalla mappa alla dichiarazione in 3 tap: pillola e "+" si aggiornano', async () => {
      seedBackend();
      await renderApp('ready', '/map');
      await fireEvent.press(
        await screen.findByRole('button', {
          name: 'ui:hotSpot.a11y({"venue":"Arena Club","going":"3–10","maybe":"ui:band.few"})',
        }),
      ); // tap 1
      await fireEvent.press(await screen.findByRole('button', { name: 'venue:cta' })); // tap 2
      await fireEvent.press(await screen.findByRole('button', { name: 'venue:declare.going' })); // tap 3
      await waitFor(() =>
        expect(fakeSupabase.rpc).toHaveBeenCalledWith('declare', {
          p_intent: 'going',
          p_venue_id: 'arena',
        }),
      );
      await fireEvent.press(await screen.findByRole('button', { name: 'venue:back' }));
      expect(
        await screen.findByRole('button', { name: pillName('goingAction') }),
      ).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: 'ui:topBar.post' })).toBeOnTheScreen();
    });

    it('Modifica cambia l’intenzione e la pillola si aggiorna senza riavvio', async () => {
      seedBackend({ mine: 'going' });
      await renderApp('ready', '/map');
      await fireEvent.press(await screen.findByRole('button', { name: pillName('goingAction') }));
      await fireEvent.press(await screen.findByRole('button', { name: 'venue:cta' }));
      await fireEvent.press(await screen.findByRole('button', { name: /venue:declare.edit/ }));
      await fireEvent.press(await screen.findByRole('button', { name: 'venue:back' }));
      expect(
        await screen.findByRole('button', { name: pillName('maybeAction') }),
      ).toBeOnTheScreen();
    });

    it('Annulla toglie la dichiarazione: sparisce la pillola e il "+"', async () => {
      seedBackend({ mine: 'going' });
      await renderApp('ready', '/map');
      await fireEvent.press(await screen.findByRole('button', { name: pillName('goingAction') }));
      await fireEvent.press(await screen.findByRole('button', { name: 'venue:cta' }));
      await fireEvent.press(await screen.findByRole('button', { name: 'venue:declare.cancel' }));
      await fireEvent.press(screen.getByRole('button', { name: 'venue:declare.confirmYes' }));
      await fireEvent.press(await screen.findByRole('button', { name: 'venue:back' }));
      await waitFor(() =>
        expect(screen.queryByRole('button', { name: 'ui:topBar.post' })).toBeNull(),
      );
      expect(screen.queryByRole('button', { name: pillName('goingAction') })).toBeNull();
    });
  });

  it('se il locale non esiste mostra l’errore ma resta la barra con indietro', async () => {
    setFakeRpc({ get_venue_detail: [], get_venue_stats: [stats()] });
    await renderApp('ready', '/venue/missing');
    expect(await screen.findByText('venue:loadError')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'venue:title' })).toBeOnTheScreen();
  });
});
