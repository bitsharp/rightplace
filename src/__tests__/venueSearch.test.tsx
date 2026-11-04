import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderApp } from '@/test/appFlows';
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
  setFakeTable('cities', [
    { id: 'c1', slug: 'milano', name: 'Milano', is_active: true },
    { id: 'c2', slug: 'las-palmas', name: 'Las Palmas', is_active: true },
  ]);
  setFakeTable('venues', [
    venue('1', 'Bar Brera', 'bar'),
    venue('2', 'Club Navigli', 'club'),
    venue('3', 'Terrazza Isola', 'rooftop'),
    venue('4', 'Club Sponsor', 'club'),
    venue('5', 'Azotea Canteras', 'rooftop', 'las-palmas'),
  ]);
  fakeSupabase.rpc.mockImplementation(async (name: string) => {
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
});
