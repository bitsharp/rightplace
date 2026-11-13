import { act, fireEvent, screen, waitFor } from '@testing-library/react-native';

import { GOOGLE_DEBOUNCE_MS } from '@/features/venues/domain/googleSession';

import { renderApp } from '@/test/appFlows';
import { useMapStore } from '@/features/map/store/mapStore';
import { fakeSupabase, setFakeTable } from '@/test/fakeSupabase';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
}));

const venue = (id: string, name: string, kind: string, city = 'milano') => ({
  id,
  name,
  kind,
  address: null,
  google_place_id: `place-${id}`,
  is_active: true,
  cities: { slug: city, name: city === 'milano' ? 'Milano' : 'Las Palmas' },
});

const band = (id: string, going: string, maybe: string, sponsored = false) => ({
  venue_id: id,
  going_band: going,
  maybe_band: maybe,
  is_sponsored: sponsored,
});

function seedCatalog() {
  setFakeTable('venues', [
    venue('1', 'Bar Brera', 'bar'),
    venue('2', 'Club Navigli', 'club'),
    venue('3', 'Terrazza Isola', 'rooftop'),
    venue('4', 'Club Sponsor', 'club'),
    venue('5', 'Azotea Canteras', 'rooftop', 'las-palmas'),
  ]);
  fakeSupabase.rpc.mockImplementation(async (name: string) => {
    if (name === 'get_active_cities') {
      return {
        data: [
          {
            slug: 'las-palmas',
            name: 'Las Palmas',
            country: 'ES',
            lat: 28.1,
            lng: -15.4,
            default_zoom: 13,
          },
          {
            slug: 'milano',
            name: 'Milano',
            country: 'IT',
            lat: 45.46,
            lng: 9.19,
            default_zoom: 13,
          },
        ],
        error: null,
      };
    }
    if (name === 'search_venues') {
      return {
        data: [
          band('2', '50–100', '30–50'),
          band('4', 'pochi', 'pochi', true),
          band('1', '3–10', 'pochi'),
        ],
        error: null,
      };
    }
    return { data: null, error: null };
  });
}

const rowNames = () =>
  screen
    .getAllByRole('button')
    .map((button) => button.props.accessibilityLabel)
    .filter((label): label is string => /^(Bar|Club|Terrazza|Azotea)/.test(label ?? ''));

describe('ricerca locali', () => {
  beforeEach(seedCatalog);

  it('mostra i locali della città con i sponsorizzati in testa, poi per affluenza', async () => {
    await renderApp('ready', '/search');
    await screen.findByText('Club Sponsor');
    await waitFor(() =>
      expect(rowNames()).toEqual(['Club Sponsor', 'Club Navigli', 'Bar Brera', 'Terrazza Isola']),
    );
    expect(screen.getByText('ui:labels.sponsored')).toBeOnTheScreen();
    expect(screen.getByText('venues:count({"count":4})')).toBeOnTheScreen();
  });

  it('chiede le fasce con la RPC della città, senza testo', async () => {
    await renderApp('ready', '/search');
    await screen.findByText('Club Sponsor');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('search_venues', { p_city_slug: 'milano' });
  });

  it('filtra per tipo di locale', async () => {
    await renderApp('ready', '/search');
    await screen.findByText('Club Sponsor');
    await fireEvent.press(screen.getByRole('button', { name: 'venues:kind.rooftop' }));
    expect(rowNames()).toEqual(['Terrazza Isola']);
    await fireEvent.press(screen.getByRole('button', { name: 'venues:kind.all' }));
    expect(rowNames()).toHaveLength(4);
  });

  it('cerca per testo ignorando maiuscole', async () => {
    await renderApp('ready', '/search');
    await screen.findByText('Club Sponsor');
    await fireEvent.changeText(screen.getByLabelText('venues:searchLabel'), 'NAVIGLI');
    expect(rowNames()).toEqual(['Club Navigli']);
    expect(screen.getByText('venues:count({"count":1})')).toBeOnTheScreen();
  });

  it('senza risultati mostra il messaggio e conta zero', async () => {
    await renderApp('ready', '/search');
    await screen.findByText('Club Sponsor');
    await fireEvent.changeText(screen.getByLabelText('venues:searchLabel'), 'zzz');
    expect(screen.getByText('venues:empty')).toBeOnTheScreen();
    expect(screen.getByText('venues:count({"count":0})')).toBeOnTheScreen();
  });

  it('cambiando città mostra i locali dell’altra città', async () => {
    await renderApp('ready', '/search');
    await screen.findByText('Club Sponsor');
    await fireEvent.press(screen.getByRole('button', { name: 'Las Palmas' }));
    expect(await screen.findByText('Azotea Canteras')).toBeOnTheScreen();
    expect(screen.queryByText('Club Navigli')).not.toBeOnTheScreen();
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('search_venues', { p_city_slug: 'las-palmas' });
  });

  it('la città scelta nella ricerca è la stessa della mappa (una sola fonte di verità)', async () => {
    await renderApp('ready', '/search');
    await screen.findByText('Club Sponsor');
    await fireEvent.press(screen.getByRole('button', { name: 'Las Palmas' }));
    expect(useMapStore.getState().citySlug).toBe('las-palmas');
  });

  it('la ricerca parte dalla città già scelta sulla mappa', async () => {
    useMapStore.setState({ citySlug: 'las-palmas' });
    await renderApp('ready', '/search');
    expect(await screen.findByText('Azotea Canteras')).toBeOnTheScreen();
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('search_venues', { p_city_slug: 'las-palmas' });
  });

  it('mostra sempre l’attribuzione a Google Maps', async () => {
    await renderApp('ready', '/search');
    expect(await screen.findByText('venues:googleAttribution')).toBeOnTheScreen();
  });

  it('un tap registra il recente e apre il dettaglio del locale', async () => {
    await renderApp('ready', '/search');
    await fireEvent.press(await screen.findByRole('button', { name: 'Club Navigli' }));
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('remember_venue', { p_venue_id: '2' });
    expect(await screen.findByRole('header', { name: 'venue:title' })).toBeOnTheScreen();
  });

  it('mostra i recenti come chip e un tap apre il locale', async () => {
    setFakeTable('search_history', [
      {
        venue_id: '3',
        searched_at: '2026-11-03T10:00:00Z',
        venues: { name: 'Terrazza Isola', is_active: true },
      },
    ]);
    await renderApp('ready', '/search');
    expect(await screen.findByText('venues:recent')).toBeOnTheScreen();
    await fireEvent.press(
      await screen.findByRole('button', { name: 'venues:recentA11y({"name":"Terrazza Isola"})' }),
    );
    expect(await screen.findByRole('header', { name: 'venue:title' })).toBeOnTheScreen();
  });

  it('senza cronologia non mostra la sezione recenti', async () => {
    await renderApp('ready', '/search');
    await screen.findByText('Club Sponsor');
    expect(screen.queryByText('venues:recent')).not.toBeOnTheScreen();
  });

  it('la tab Mappa ha il campo che apre la ricerca', async () => {
    await renderApp('ready', '/map');
    await fireEvent.press(await screen.findByRole('button', { name: 'map:searchPlaceholder' }));
    expect(await screen.findByLabelText('venues:searchLabel')).toBeOnTheScreen();
  });

  describe('Risultati da Google', () => {
    const SUGGESTION = {
      placeId: 'ChIJaddr',
      primaryText: 'Via Torino 20',
      secondaryText: 'Milano MI',
      types: ['street_address'],
    };
    const invokeCalls = (name: string) =>
      fakeSupabase.functions.invoke.mock.calls.filter(([called]) => called === name);
    const typeQuery = async (text: string) => {
      await fireEvent.changeText(screen.getByLabelText('venues:searchLabel'), text);
      await act(async () => void jest.advanceTimersByTime(GOOGLE_DEBOUNCE_MS));
    };

    beforeEach(() => {
      fakeSupabase.functions.invoke.mockImplementation(async (name: string) => {
        if (name === 'places-search') return { data: { suggestions: [SUGGESTION] }, error: null };
        if (name === 'places-detail') return { data: { venue_id: 'venue-new' }, error: null };
        return { data: null, error: null };
      });
    });

    it('sotto i 3 caratteri o prima dei 300 ms non chiama Google', async () => {
      await renderApp('ready', '/search');
      await screen.findByText('Club Sponsor');
      await fireEvent.changeText(screen.getByLabelText('venues:searchLabel'), 'vi');
      await act(async () => void jest.advanceTimersByTime(GOOGLE_DEBOUNCE_MS * 2));
      await fireEvent.changeText(screen.getByLabelText('venues:searchLabel'), 'via');
      await act(async () => void jest.advanceTimersByTime(GOOGLE_DEBOUNCE_MS - 100));
      expect(invokeCalls('places-search')).toHaveLength(0);
    });

    it("dopo il debounce mostra i risultati sotto il catalogo, con l'attribuzione", async () => {
      await renderApp('ready', '/search');
      await screen.findByText('Club Sponsor');
      await typeQuery('via torino 20');
      expect(await screen.findByText('venues:google.title')).toBeOnTheScreen();
      expect(screen.getByText('Via Torino 20')).toBeOnTheScreen();
      expect(screen.getByText('venues:google.attribution')).toBeOnTheScreen();
      const body = invokeCalls('places-search')[0]?.[1] as { body: Record<string, unknown> };
      expect(body.body).toMatchObject({
        input: 'via torino 20',
        citySlug: 'milano',
        language: 'it',
      });
      expect(body.body).not.toHaveProperty('sessionStart');
      expect(String(body.body.sessionToken)).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('la stessa digitazione riusa lo stesso sessionToken', async () => {
      await renderApp('ready', '/search');
      await screen.findByText('Club Sponsor');
      await typeQuery('via torino');
      await typeQuery('via torino 20');
      const tokens = invokeCalls('places-search').map(
        ([, options]) => (options as { body: { sessionToken: string } }).body.sessionToken,
      );
      expect(tokens).toHaveLength(2);
      expect(tokens[0]).toBe(tokens[1]);
    });

    it('un tap sul risultato chiude la sessione con places-detail e apre la scheda', async () => {
      await renderApp('ready', '/search');
      await screen.findByText('Club Sponsor');
      await typeQuery('via torino 20');
      await fireEvent.press(
        await screen.findByRole('button', {
          name: 'venues:google.rowA11y({"name":"Via Torino 20","place":"Milano MI"})',
        }),
      );
      await waitFor(() => expect(invokeCalls('places-detail')).toHaveLength(1));
      const sent = (invokeCalls('places-detail')[0]?.[1] as { body: Record<string, unknown> }).body;
      expect(sent).toMatchObject({ place_id: 'ChIJaddr', city_slug: 'milano', language: 'it' });
      expect(sent.session_token).toBe(
        (invokeCalls('places-search')[0]?.[1] as { body: { sessionToken: string } }).body
          .sessionToken,
      );
      expect(await screen.findByRole('header', { name: 'venue:title' })).toBeOnTheScreen();
      expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_venue_detail', {
        p_venue_id: 'venue-new',
      });
    });

    it('un risultato già presente come riga del catalogo compare una volta sola', async () => {
      fakeSupabase.functions.invoke.mockImplementation(async () => ({
        data: { suggestions: [{ ...SUGGESTION, placeId: 'place-2', primaryText: 'Club Navigli' }] },
        error: null,
      }));
      await renderApp('ready', '/search');
      await screen.findByText('Club Sponsor');
      await typeQuery('navigli');
      await waitFor(() => expect(invokeCalls('places-search')).toHaveLength(1));
      expect(screen.getAllByText('Club Navigli')).toHaveLength(1);
      expect(screen.queryByText('venues:google.title')).toBeNull();
    });

    it('429: messaggio sul limite giornaliero e il catalogo resta', async () => {
      fakeSupabase.functions.invoke.mockResolvedValue({
        data: null,
        error: { message: 'limit', context: { status: 429 } },
      });
      await renderApp('ready', '/search');
      await screen.findByText('Club Sponsor');
      await typeQuery('club');
      expect(await screen.findByText('venues:google.limit')).toBeOnTheScreen();
      expect(screen.getByText('Club Sponsor')).toBeOnTheScreen();
    });

    it('errore di Google: messaggio, senza rompere la ricerca nel catalogo', async () => {
      fakeSupabase.functions.invoke.mockResolvedValue({ data: null, error: { message: 'boom' } });
      await renderApp('ready', '/search');
      await screen.findByText('Club Sponsor');
      await typeQuery('navigli');
      expect(await screen.findByText('venues:google.error')).toBeOnTheScreen();
      expect(rowNames()).toEqual(['Club Navigli']);
    });
  });
});
