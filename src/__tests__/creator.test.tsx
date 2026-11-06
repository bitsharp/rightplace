import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';

import { renderApp } from '@/test/appFlows';
import { fakeSupabase, setFakeRpc, setFakeTable } from '@/test/fakeSupabase';

// Creator area on: these flows cover it; the flag-off behaviour is in creatorFlagOff.test.tsx.
process.env.EXPO_PUBLIC_CREATOR_ENABLED = 'true';

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(async () => ({ granted: false })),
}));

// Friday 6 Nov 2026, 15:00 in Milan.
const NOW = new Date('2026-11-06T14:00:00Z');

const CREATOR = { is_creator: true };

const eventRow = (overrides: Record<string, unknown> = {}) => ({
  event_id: 'e1',
  name: 'Notte Techno',
  description: 'Dj set tutta la notte',
  venue_id: 'v1',
  venue_name: 'Arena Club',
  venue_kind: 'club',
  starts_at: '2026-11-07T21:00:00Z',
  ends_at: '2026-11-08T03:00:00Z',
  cancelled_at: null,
  going_band: '10–20',
  maybe_band: 'pochi',
  target_age_bands: ['18-24'],
  target_genders: [],
  is_sponsored: false,
  can_edit: true,
  timezone: 'Europe/Rome',
  ...overrides,
});

const pastRow = eventRow({
  event_id: 'e0',
  name: 'Serata Passata',
  starts_at: '2026-11-01T21:00:00Z',
  ends_at: '2026-11-02T03:00:00Z',
  going_band: '3–10',
  can_edit: false,
});
const cancelledRow = eventRow({
  event_id: 'e2',
  name: 'Serata Saltata',
  cancelled_at: '2026-11-05T10:00:00Z',
  can_edit: false,
});

const detailRow = (overrides: Record<string, unknown> = {}) => ({
  event_id: 'e1',
  name: 'Notte Techno',
  description: 'Dj set tutta la notte',
  starts_at: '2026-11-07T21:00:00Z',
  ends_at: '2026-11-08T03:00:00Z',
  cancelled_at: null,
  target_age_bands: ['18-24'],
  target_genders: [],
  venue_id: 'v1',
  venue_name: 'Arena Club',
  venue_kind: 'club',
  address: null,
  lat: 45.46,
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
  is_mine: true,
  creator_handle: 'lince.rosso',
  ...overrides,
});

const attendance = (overrides: Record<string, unknown> = {}) => ({
  going_band: 'pochi',
  maybe_band: 'pochi',
  avg_age: null,
  female_pct: null,
  male_pct: null,
  other_pct: null,
  ...overrides,
});

const venue = (id: string, name: string, kind: string) => ({
  id,
  name,
  kind,
  address: null,
  google_place_id: `place-${id}`,
  is_active: true,
  cities: { slug: 'milano', name: 'Milano' },
});

const VENUE_DETAIL = {
  venue_id: 'v1',
  name: 'Arena Club',
  kind: 'club',
  address: null,
  opening_hours: null,
  google_place_id: 'p1',
  lat: 45.46,
  lng: 9.19,
  city_slug: 'milano',
  city_name: 'Milano',
  country: 'IT',
  timezone: 'Europe/Rome',
  taxi_number: null,
};

function seedBackend(responses: Record<string, unknown> = {}) {
  setFakeTable('venues', [venue('v1', 'Arena Club', 'club'), venue('v2', 'Bar Brera', 'bar')]);
  setFakeRpc({
    get_my_creator_events: (args: unknown) =>
      (args as { p_scope: string }).p_scope === 'past' ? [pastRow, cancelledRow] : [eventRow()],
    get_event_detail: [detailRow()],
    get_event_attendance: [attendance()],
    get_venue_detail: [VENUE_DETAIL],
    create_event: 'new-event',
    update_event: null,
    cancel_event: null,
    get_post_target: [],
    get_story_posts: [],
    get_stories: [],
    ...responses,
  });
}

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  jest.setSystemTime(NOW);
});
afterEach(() => jest.useRealTimers());

describe('dal profilo', () => {
  it('un creator trova "Il tuo profilo creator" e arriva alle sue serate', async () => {
    seedBackend();
    await renderApp('ready', '/profile', CREATOR);
    await fireEvent.press(await screen.findByText('profile:app.creatorProfile'));
    expect(await screen.findByText('creator:events.title')).toBeOnTheScreen();
  });

  it('chi non lo è vede "Diventa creator" e arriva all’invito', async () => {
    seedBackend();
    await renderApp('ready', '/profile');
    await fireEvent.press(await screen.findByText('profile:app.becomeCreator'));
    expect(await screen.findByText('creator:notCreator.title')).toBeOnTheScreen();
  });
});

describe('profilo creator', () => {
  it('a chi non è creator propone di diventarlo dal profilo', async () => {
    seedBackend();
    await renderApp('ready', '/creator');
    expect(await screen.findByText('creator:notCreator.title')).toBeOnTheScreen();
    expect(screen.queryByText('creator:events.title')).toBeNull();
    await fireEvent.press(screen.getByRole('button', { name: 'creator:notCreator.cta' }));
    expect(await screen.findByText('profile:app.becomeCreator')).toBeOnTheScreen();
    expect(rpcCalls('get_my_creator_events')).toHaveLength(0);
  });

  it('mostra l’intestazione con l’handle e lo spazio vuoto per il piano', async () => {
    seedBackend();
    await renderApp('ready', '/creator', CREATOR);
    expect(await screen.findByText('creator:profile.label')).toBeOnTheScreen();
    expect(screen.getByText('@lince.rosso')).toBeOnTheScreen();
    expect(screen.getByTestId('creator-plan-slot')).toBeOnTheScreen();
  });

  it('elenca le serate in programma con locale, quando, fasce e target', async () => {
    seedBackend();
    await renderApp('ready', '/creator', CREATOR);
    expect(await screen.findByText('Notte Techno')).toBeOnTheScreen();
    expect(screen.getByText('Arena Club · venues:kind.club')).toBeOnTheScreen();
    expect(
      screen.getByText('ui:eventWhen.tomorrow({"time":"22:00","endTime":"04:00"})'),
    ).toBeOnTheScreen();
    expect(screen.getByText('ui:intent.going 10–20')).toBeOnTheScreen();
    expect(screen.getByText('· ui:target.age.18-24 · ui:target.gender.all')).toBeOnTheScreen();
    expect(screen.getByText('creator:events.note')).toBeOnTheScreen();
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_my_creator_events', {
      p_scope: 'upcoming',
    });
  });

  it('"Passate" mostra le finite e le annullate col badge', async () => {
    seedBackend();
    await renderApp('ready', '/creator', CREATOR);
    await screen.findByText('Notte Techno');
    await fireEvent.press(screen.getByRole('button', { name: 'creator:scope.past' }));
    expect(await screen.findByText('Serata Passata')).toBeOnTheScreen();
    expect(screen.getByText('Serata Saltata')).toBeOnTheScreen();
    expect(screen.getAllByText('ui:event.cancelled')).toHaveLength(1);
    expect(screen.queryByText('Notte Techno')).toBeNull();
  });

  it('senza serate dice come cominciare', async () => {
    seedBackend({ get_my_creator_events: [] });
    await renderApp('ready', '/creator', CREATOR);
    expect(await screen.findByText('creator:events.emptyUpcoming')).toBeOnTheScreen();
  });

  it('"Nuova serata" apre il form', async () => {
    seedBackend();
    await renderApp('ready', '/creator', CREATOR);
    await fireEvent.press(await screen.findByRole('button', { name: 'creator:events.new' }));
    expect(await screen.findByText('creator:form.label')).toBeOnTheScreen();
  });
});

describe('crea serata', () => {
  async function fillValidForm() {
    await fireEvent.press(await screen.findByRole('button', { name: 'Arena Club' }));
    await fireEvent.changeText(screen.getByLabelText('creator:form.name.label'), '  Notte Techno ');
    await fireEvent.changeText(screen.getByLabelText('creator:form.description.label'), 'Dj set');
    await fireEvent.press(screen.getByRole('button', { name: 'ui:target.age.18-24' }));
    await fireEvent.press(screen.getByRole('button', { name: 'ui:target.age.35+' }));
    await fireEvent.press(screen.getByRole('button', { name: 'ui:target.gender.female' }));
  }

  it('non è raggiungibile da chi non è creator', async () => {
    seedBackend();
    await renderApp('ready', '/creator/new-event');
    expect(await screen.findByText('creator:notCreator.title')).toBeOnTheScreen();
    expect(screen.queryByLabelText('creator:form.name.label')).toBeNull();
  });

  it('mostra il form di CreaSerata con il locale della città e il contatore', async () => {
    seedBackend();
    await renderApp('ready', '/creator/new-event', CREATOR);
    expect(await screen.findByText('creator:form.label')).toBeOnTheScreen();
    expect(await screen.findByText('Bar Brera')).toBeOnTheScreen();
    expect(
      screen.getByText('creator:form.description.counter({"count":0,"max":500})'),
    ).toBeOnTheScreen();
    await fireEvent.changeText(screen.getByLabelText('creator:form.description.label'), 'ciao');
    expect(
      screen.getByText('creator:form.description.counter({"count":4,"max":500})'),
    ).toBeOnTheScreen();
  });

  it('con il form vuoto mostra gli errori sotto i campi e non chiama il server', async () => {
    seedBackend();
    await renderApp('ready', '/creator/new-event', CREATOR);
    await fireEvent.press(await screen.findByRole('button', { name: 'creator:form.submit' }));
    expect(await screen.findByText('creator:form.errors.venueRequired')).toBeOnTheScreen();
    expect(screen.getByText('creator:form.errors.nameRequired')).toBeOnTheScreen();
    expect(rpcCalls('create_event')).toHaveLength(0);
  });

  it('pubblica: chiama create_event con i target in array e torna al profilo creator', async () => {
    seedBackend();
    await renderApp('ready', '/creator', CREATOR);
    await fireEvent.press(await screen.findByRole('button', { name: 'creator:events.new' }));
    await fillValidForm();
    await fireEvent.press(screen.getByRole('button', { name: 'creator:form.submit' }));
    await waitFor(() => expect(rpcCalls('create_event')).toHaveLength(1));
    expect(rpcCalls('create_event')[0]?.[1]).toEqual({
      p_venue_id: 'v1',
      p_name: 'Notte Techno',
      p_description: 'Dj set',
      p_starts_at: '2026-11-06T21:00:00.000Z',
      p_ends_at: '2026-11-07T03:00:00.000Z',
      p_target_age_bands: ['18-24', '35-44', '45+'],
      p_target_genders: ['female'],
    });
    expect(await screen.findByText('creator:events.title')).toBeOnTheScreen();
  });

  it('senza età né genere i target sono array vuoti: "Tutti"', async () => {
    seedBackend();
    await renderApp('ready', '/creator/new-event', CREATOR);
    await fireEvent.press(await screen.findByRole('button', { name: 'Arena Club' }));
    await fireEvent.changeText(screen.getByLabelText('creator:form.name.label'), 'Notte');
    await fireEvent.press(screen.getByRole('button', { name: 'creator:form.submit' }));
    await waitFor(() => expect(rpcCalls('create_event')).toHaveLength(1));
    expect(rpcCalls('create_event')[0]?.[1]).toMatchObject({
      p_target_age_bands: [],
      p_target_genders: [],
    });
  });

  it('l’orario si sposta a passi e la fine segue finché non la tocchi', async () => {
    seedBackend();
    await renderApp('ready', '/creator/new-event', CREATOR);
    await fireEvent.press(await screen.findByRole('button', { name: 'creator:form.time.nextDay' }));
    await fireEvent.press(screen.getByRole('button', { name: 'creator:form.time.startLater' }));
    await fireEvent.press(await screen.findByRole('button', { name: 'Arena Club' }));
    await fireEvent.changeText(screen.getByLabelText('creator:form.name.label'), 'Notte');
    await fireEvent.press(screen.getByRole('button', { name: 'creator:form.submit' }));
    await waitFor(() => expect(rpcCalls('create_event')).toHaveLength(1));
    expect(rpcCalls('create_event')[0]?.[1]).toMatchObject({
      p_starts_at: '2026-11-07T21:30:00.000Z',
      p_ends_at: '2026-11-08T03:30:00.000Z',
    });
  });

  it('una fine oltre le 06:00 è un errore sotto il campo', async () => {
    seedBackend();
    await renderApp('ready', '/creator/new-event', CREATOR);
    await fireEvent.press(await screen.findByRole('button', { name: 'Arena Club' }));
    await fireEvent.changeText(screen.getByLabelText('creator:form.name.label'), 'Notte');
    for (let step = 0; step < 5; step += 1) {
      await fireEvent.press(screen.getByRole('button', { name: 'creator:form.time.endLater' }));
    }
    await fireEvent.press(screen.getByRole('button', { name: 'creator:form.submit' }));
    expect(await screen.findByText('creator:form.errors.endAfterNight')).toBeOnTheScreen();
    expect(rpcCalls('create_event')).toHaveLength(0);
  });

  it('l’11ª serata attiva: il rifiuto del server è mostrato tradotto', async () => {
    seedBackend();
    fakeSupabase.rpc.mockImplementation(async (name: string, args?: unknown) => {
      if (name === 'create_event')
        return { data: null, error: { message: 'TOO_MANY_ACTIVE_EVENTS' } };
      if (name === 'get_venue_detail') return { data: [VENUE_DETAIL], error: null };
      return { data: null, error: null, ...(args ? {} : {}) };
    });
    await renderApp('ready', '/creator/new-event', CREATOR);
    await fireEvent.press(await screen.findByRole('button', { name: 'Arena Club' }));
    await fireEvent.changeText(screen.getByLabelText('creator:form.name.label'), 'Notte');
    await fireEvent.press(screen.getByRole('button', { name: 'creator:form.submit' }));
    expect(await screen.findByText('errors:rpc.TOO_MANY_ACTIVE_EVENTS')).toBeOnTheScreen();
  });
});

describe('adesioni del creator', () => {
  it('con meno di 3 persone: "pochi" e dati nascosti, mai chi ha aderito', async () => {
    seedBackend();
    await renderApp('ready', '/creator/event/e1', CREATOR);
    expect(await screen.findByText('venue:who.hidden.all')).toBeOnTheScreen();
    expect(screen.getAllByText('ui:band.few')).toHaveLength(2);
    expect(screen.queryByText(/ui:age.years/)).toBeNull();
    expect(screen.queryByText(/^@/)).toBeNull();
    expect(screen.getByText('creator:attendance.note')).toBeOnTheScreen();
  });

  it('con 3 o più: fascia, età media e genere', async () => {
    seedBackend({
      get_event_attendance: [
        attendance({ going_band: '3–10', avg_age: 24, female_pct: 60, male_pct: 40, other_pct: 0 }),
      ],
    });
    await renderApp('ready', '/creator/event/e1', CREATOR);
    expect(await screen.findByText('ui:age.years({"age":24})')).toBeOnTheScreen();
    expect(screen.getByText('3–10')).toBeOnTheScreen();
    expect(screen.getByTestId('gender-female')).toBeOnTheScreen();
  });

  it('da una riga della lista si arriva al dettaglio', async () => {
    seedBackend();
    await renderApp('ready', '/creator', CREATOR);
    await fireEvent.press(await screen.findByRole('button', { name: 'Notte Techno' }));
    expect(await screen.findByText('creator:attendance.note')).toBeOnTheScreen();
  });

  it('Annulla la serata chiede conferma e poi chiama cancel_event', async () => {
    seedBackend();
    await renderApp('ready', '/creator/event/e1', CREATOR);
    await fireEvent.press(await screen.findByRole('button', { name: 'creator:attendance.cancel' }));
    expect(rpcCalls('cancel_event')).toHaveLength(0);
    expect(screen.getByText('creator:attendance.cancelConfirm')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('button', { name: 'creator:attendance.confirmYes' }));
    await waitFor(() => expect(rpcCalls('cancel_event')).toHaveLength(1));
    expect(rpcCalls('cancel_event')[0]?.[1]).toEqual({ p_event_id: 'e1' });
  });

  it('"Mantieni" non annulla nulla', async () => {
    seedBackend();
    await renderApp('ready', '/creator/event/e1', CREATOR);
    await fireEvent.press(await screen.findByRole('button', { name: 'creator:attendance.cancel' }));
    await fireEvent.press(screen.getByRole('button', { name: 'creator:attendance.confirmNo' }));
    expect(rpcCalls('cancel_event')).toHaveLength(0);
    expect(screen.queryByText('creator:attendance.cancelConfirm')).toBeNull();
  });

  it('una serata già iniziata non si modifica; una annullata non ha azioni', async () => {
    seedBackend({ get_event_detail: [detailRow({ starts_at: '2026-11-06T13:00:00Z' })] });
    await renderApp('ready', '/creator/event/e1', CREATOR);
    await screen.findByText('creator:attendance.note');
    expect(screen.queryByRole('button', { name: 'creator:attendance.edit' })).toBeNull();
  });

  it('una serata annullata mostra il banner e nessuna azione', async () => {
    seedBackend({ get_event_detail: [detailRow({ cancelled_at: '2026-11-05T10:00:00Z' })] });
    await renderApp('ready', '/creator/event/e1', CREATOR);
    expect(await screen.findByText('creator:attendance.cancelled')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'creator:attendance.cancel' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'creator:attendance.edit' })).toBeNull();
  });

  it('di una serata non mia non si vede nulla', async () => {
    seedBackend({
      get_event_detail: [detailRow({ is_mine: false })],
      get_event_attendance: () => {
        throw new Error('non deve essere letta');
      },
    });
    await renderApp('ready', '/creator/event/e1', CREATOR);
    expect(await screen.findByText('creator:attendance.notFound')).toBeOnTheScreen();
  });
});

describe('modifica serata', () => {
  it('precompila il form, blocca il locale e salva con update_event', async () => {
    seedBackend();
    await renderApp('ready', '/creator/event/e1', CREATOR);
    await fireEvent.press(await screen.findByRole('button', { name: 'creator:attendance.edit' }));
    expect(await screen.findByDisplayValue('Notte Techno')).toBeOnTheScreen();
    expect(screen.getByText('creator:form.venue.locked')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'creator:form.venue.change' })).toBeNull();
    expect(screen.getByRole('button', { name: 'ui:target.age.18-24' })).toBeSelected();
    await fireEvent.changeText(screen.getByLabelText('creator:form.name.label'), 'Notte Techno 2');
    await fireEvent.press(screen.getByRole('button', { name: 'creator:form.save' }));
    await waitFor(() => expect(rpcCalls('update_event')).toHaveLength(1));
    expect(rpcCalls('update_event')[0]?.[1]).toMatchObject({
      p_event_id: 'e1',
      p_name: 'Notte Techno 2',
      p_starts_at: '2026-11-07T21:00:00.000Z',
      p_target_age_bands: ['18-24'],
    });
    expect(
      within(screen.getByTestId('screen-scroll')).queryByText('creator:form.errors.startInPast'),
    ).toBeNull();
  });

  it('se la serata è già iniziata dice che non si può modificare', async () => {
    seedBackend({ get_event_detail: [detailRow({ starts_at: '2026-11-06T13:00:00Z' })] });
    await renderApp('ready', '/creator/edit-event/e1', CREATOR);
    expect(await screen.findByText('creator:form.notEditable')).toBeOnTheScreen();
  });
});
