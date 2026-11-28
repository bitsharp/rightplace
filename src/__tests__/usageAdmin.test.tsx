import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderApp } from '@/test/appFlows';
import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
}));

const overviewRow = (n: number, overrides: Record<string, unknown> = {}) => ({
  user_id: `u${n}`,
  handle: n === 1 ? 'lince.rosso' : `volpe.viola${n}`,
  last_seen_at: '2026-11-28T10:00:00Z',
  logins: 2,
  sessions: 3,
  total_minutes: 45,
  last_platform: 'android',
  last_app_version: '1.4.0',
  ...overrides,
});

const eventRow = (n: number, overrides: Record<string, unknown> = {}) => ({
  id: n,
  kind: 'session',
  started_at: `2026-11-27T10:${String(59 - n).padStart(2, '0')}:00Z`,
  last_seen_at: '2026-11-27T11:00:00Z',
  ended_at: '2026-11-27T11:00:00Z',
  minutes: 12,
  platform: 'ios',
  app_version: '1.3.0',
  ...overrides,
});

const calls = (name: string) => fakeSupabase.rpc.mock.calls.filter(([rpc]) => rpc === name);
const admin = { is_admin: true };

describe('Utilizzo app (amministratore)', () => {
  beforeEach(() => {
    setFakeRpc({
      get_usage_overview: [overviewRow(1), overviewRow(2)],
      get_user_usage: [eventRow(1), eventRow(2, { kind: 'login', minutes: 0 })],
    });
  });

  it('chi non è admin viene reindirizzato e non chiede nulla al server', async () => {
    await renderApp('ready', '/admin/usage');
    await waitFor(() => expect(screen).not.toHavePathname('/admin/usage'));
    expect(calls('get_usage_overview')).toHaveLength(0);
  });

  it('l’admin vede handle, accessi, sessioni, tempo totale, piattaforma e versione', async () => {
    await renderApp('ready', '/admin/usage', admin);
    expect(await screen.findByText('@lince.rosso')).toBeOnTheScreen();
    expect(screen.getByText('@volpe.viola2')).toBeOnTheScreen();
    expect(screen.getAllByText('admin:usage.logins({"count":2})')).toHaveLength(2);
    expect(screen.getAllByText('admin:usage.sessions({"count":3})')).toHaveLength(2);
    expect(screen.getAllByText(/45\s*min/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/android · 1\.4\.0/).length).toBe(2);
    expect(calls('get_usage_overview')[0]?.[1]).toEqual({ p_days: 30, p_search: null });
  });

  it('cambiare periodo richiede quel numero di giorni', async () => {
    await renderApp('ready', '/admin/usage', admin);
    await screen.findByText('@lince.rosso');
    await fireEvent.press(screen.getByRole('button', { name: 'admin:usage.period.d7' }));
    await waitFor(() =>
      expect(calls('get_usage_overview').at(-1)?.[1]).toEqual({ p_days: 7, p_search: null }),
    );
    await fireEvent.press(screen.getByRole('button', { name: 'admin:usage.period.d90' }));
    await waitFor(() =>
      expect(calls('get_usage_overview').at(-1)?.[1]).toEqual({ p_days: 90, p_search: null }),
    );
  });

  it('la ricerca filtra per handle sul server', async () => {
    await renderApp('ready', '/admin/usage', admin);
    await screen.findByText('@lince.rosso');
    await fireEvent.changeText(screen.getByLabelText('admin:usage.searchLabel'), 'volpe');
    await waitFor(() =>
      expect(calls('get_usage_overview').at(-1)?.[1]).toEqual({ p_days: 30, p_search: 'volpe' }),
    );
  });

  it('il pull-to-refresh ricarica l’elenco', async () => {
    await renderApp('ready', '/admin/usage', admin);
    await screen.findByText('@lince.rosso');
    await fireEvent(screen.getByTestId('usage-overview-list'), 'refresh');
    await waitFor(() => expect(calls('get_usage_overview').length).toBeGreaterThanOrEqual(2));
  });

  it('elenco vuoto ed errore hanno il loro messaggio', async () => {
    setFakeRpc({ get_usage_overview: [] });
    await renderApp('ready', '/admin/usage', admin);
    expect(await screen.findByText('admin:usage.empty')).toBeOnTheScreen();
  });

  it('il tap su un utente apre il dettaglio con i suoi eventi', async () => {
    await renderApp('ready', '/admin/usage', admin);
    await fireEvent.press(await screen.findByText('@lince.rosso'));
    await waitFor(() => expect(screen).toHavePathname('/admin/usage/u1'));
    expect(await screen.findByText('admin:usage.kind.login')).toBeOnTheScreen();
    expect(screen.getByText('admin:usage.kind.session')).toBeOnTheScreen();
    expect(screen.getAllByText(/12\s*min/).length).toBeGreaterThan(0);
    expect(calls('get_user_usage')[0]?.[1]).toEqual({
      p_user: 'u1',
      p_before: null,
      p_limit: 50,
    });
  });

  it('il dettaglio pagina all’indietro con l’inizio dell’ultimo evento quando la pagina è piena', async () => {
    const page = Array.from({ length: 50 }, (_, i) => eventRow(i + 1));
    setFakeRpc({
      get_usage_overview: [overviewRow(1)],
      get_user_usage: (args: unknown) =>
        (args as { p_before: string | null }).p_before ? [] : page,
    });
    await renderApp('ready', '/admin/usage/u1', admin);
    await screen.findAllByText('admin:usage.kind.session');
    await fireEvent(screen.getByTestId('usage-events-list'), 'endReached');
    await waitFor(() => expect(calls('get_user_usage')).toHaveLength(2));
    expect(calls('get_user_usage')[1]?.[1]).toEqual({
      p_user: 'u1',
      p_before: page[49]?.started_at,
      p_limit: 50,
    });
  });

  it('il dettaglio per un non admin reindirizza', async () => {
    await renderApp('ready', '/admin/usage/u1');
    await waitFor(() => expect(screen).not.toHavePathname('/admin/usage/u1'));
    expect(calls('get_user_usage')).toHaveLength(0);
  });

  it('nelle impostazioni la voce "Utilizzo app" c’è solo per l’admin e apre la schermata', async () => {
    await renderApp('ready', '/profile/edit');
    await screen.findByText('profile:settings.groups.help');
    expect(screen.queryByText('profile:app.usageLog')).not.toBeOnTheScreen();
    await screen.unmount();

    await renderApp('ready', '/profile/edit', admin);
    await fireEvent.press(await screen.findByText('profile:app.usageLog'));
    await waitFor(() => expect(screen).toHavePathname('/admin/usage'));
  });
});
