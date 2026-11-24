import { fireEvent, screen, waitFor } from '@testing-library/react-native';

import { renderApp } from '@/test/appFlows';
import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
}));

const feedbackRow = (n: number, overrides: Record<string, unknown> = {}) => ({
  id: `f${n}`,
  rating: 4,
  comment: `Commento numero ${n}`,
  screen: '/venue/[id]',
  has_screenshot: false,
  app_version: '1.2.0',
  platform: 'ios',
  locale: 'it',
  created_at: `2026-11-21T10:${String(59 - n).padStart(2, '0')}:00Z`,
  author_handle: 'lince.rosso',
  ...overrides,
});

const inboxCalls = () =>
  fakeSupabase.rpc.mock.calls.filter(([name]) => name === 'get_support_feedback');

describe('Feedback ricevuti (supporto)', () => {
  beforeEach(() => {
    setFakeRpc({
      get_support_feedback: [
        feedbackRow(1, { has_screenshot: true, comment: 'Il commento intero, non troncato' }),
        feedbackRow(2, { rating: 1, platform: 'android', app_version: null }),
      ],
    });
    fakeSupabase.functions.invoke.mockResolvedValue({
      data: { urls: [{ feedbackId: 'f1', url: 'https://signed.test/f1.jpg' }] },
      error: null,
    });
  });

  it('chi non è support viene reindirizzato e non chiede nulla al server', async () => {
    await renderApp('ready', '/support/feedback');
    await waitFor(() => expect(screen).not.toHavePathname('/support/feedback'));
    expect(inboxCalls()).toHaveLength(0);
    expect(screen.queryByText('feedback:support.title')).not.toBeOnTheScreen();
  });

  it('il supporto vede voto, data, handle, schermata, piattaforma, versione e commento intero', async () => {
    await renderApp('ready', '/support/feedback', { is_support: true });
    expect(await screen.findByText('Il commento intero, non troncato')).toBeOnTheScreen();
    expect(screen.getByText('★★★★☆')).toBeOnTheScreen();
    expect(screen.getByText('★☆☆☆☆')).toBeOnTheScreen();
    expect(screen.getAllByText('@lince.rosso')).toHaveLength(2);
    expect(screen.getAllByText(/\/venue\/\[id\]/).length).toBeGreaterThan(0);
    expect(screen.getByText(/ios · 1\.2\.0/)).toBeOnTheScreen();
    expect(screen.getByText(/android/)).toBeOnTheScreen();
  });

  it('la miniatura dello screenshot apre il visualizzatore a schermo intero', async () => {
    await renderApp('ready', '/support/feedback', { is_support: true });
    const thumb = await screen.findByRole('button', { name: 'feedback:support.screenshotA11y' });
    expect(fakeSupabase.functions.invoke).toHaveBeenCalledWith('feedback-screenshot-urls', {
      body: { feedbackIds: ['f1'] },
    });
    await fireEvent.press(thumb);
    expect(await screen.findByTestId('photo-viewer-list')).toBeOnTheScreen();
  });

  it('senza screenshot non chiede URL firmati', async () => {
    setFakeRpc({ get_support_feedback: [feedbackRow(1)] });
    await renderApp('ready', '/support/feedback', { is_support: true });
    await screen.findByText('Commento numero 1');
    expect(fakeSupabase.functions.invoke).not.toHaveBeenCalled();
  });

  it('pagina all’indietro con la data dell’ultimo feedback quando la pagina è piena', async () => {
    const page = Array.from({ length: 30 }, (_, i) => feedbackRow(i + 1));
    setFakeRpc({
      get_support_feedback: (args: unknown) =>
        (args as { p_before: string | null }).p_before ? [] : page,
    });
    await renderApp('ready', '/support/feedback', { is_support: true });
    await screen.findByText('Commento numero 1');
    await fireEvent(screen.getByTestId('support-feedback-list'), 'endReached');
    await waitFor(() => expect(inboxCalls()).toHaveLength(2));
    expect(inboxCalls()[1]?.[1]).toEqual({ p_before: page[29]?.created_at, p_limit: 30 });
  });

  it('il pull-to-refresh ricarica la lista', async () => {
    await renderApp('ready', '/support/feedback', { is_support: true });
    await screen.findByText('Commento numero 2');
    const list = screen.getByTestId('support-feedback-list');
    await fireEvent(list, 'refresh');
    await waitFor(() => expect(inboxCalls().length).toBeGreaterThanOrEqual(2));
  });

  it('lista vuota: messaggio dedicato', async () => {
    setFakeRpc({ get_support_feedback: [] });
    await renderApp('ready', '/support/feedback', { is_support: true });
    expect(await screen.findByText('feedback:support.empty')).toBeOnTheScreen();
  });

  it('nel profilo la voce "Feedback ricevuti" c’è solo per il supporto e apre la schermata', async () => {
    await renderApp('ready', '/profile/edit');
    await screen.findByText('profile:settings.groups.help');
    expect(screen.queryByText('profile:app.supportFeedback')).not.toBeOnTheScreen();
    await screen.unmount();

    await renderApp('ready', '/profile/edit', { is_support: true });
    await fireEvent.press(await screen.findByText('profile:app.supportFeedback'));
    await waitFor(() => expect(screen).toHavePathname('/support/feedback'));
  });
});
