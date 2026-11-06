import { act, renderHook, waitFor } from '@testing-library/react-native';

import { fakeSupabase, setFakeRpc } from '@/test/fakeSupabase';
import { createQueryWrapper } from '@/test/queryWrapper';

import { wallTimeIn } from './domain/zonedTime';
import { useEventForm } from './useEventForm';

const DETAIL = {
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

const rpcCalls = (name: string) =>
  fakeSupabase.rpc.mock.calls.filter(([called]) => called === name);

const setup = async (options: Parameters<typeof useEventForm>[0] = {}) => {
  const { Wrapper } = createQueryWrapper();
  return renderHook(() => useEventForm(options), { wrapper: Wrapper });
};

beforeEach(() => {
  jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate', 'queueMicrotask'] });
  jest.setSystemTime(new Date('2026-11-06T14:00:00Z'));
  setFakeRpc({ get_venue_detail: [DETAIL], create_event: 'e1', update_event: null });
});
afterEach(() => jest.useRealTimers());

describe('useEventForm: orari', () => {
  it('propone le 22:00 e una fine +6 h, limitata alle 06:00', async () => {
    const { result } = await setup();
    await act(async () => result.current.setVenueId('v1'));
    await waitFor(() => expect(result.current.timeZone).toBe('Europe/Rome'));
    expect(wallTimeIn(result.current.startsAt, 'Europe/Rome')).toMatchObject({ day: 6, hour: 22 });
    expect(wallTimeIn(result.current.endsAt, 'Europe/Rome')).toMatchObject({ day: 7, hour: 4 });
  });

  it('la fine segue l’inizio finché non la tocchi', async () => {
    const { result } = await setup();
    await act(async () => result.current.shiftStart(60));
    expect(wallTimeIn(result.current.endsAt, result.current.timeZone)).toMatchObject({ hour: 5 });
  });

  it('dopo aver toccato la fine, spostare l’inizio sposta anche la fine (stessa durata)', async () => {
    const { result } = await setup();
    await act(async () => result.current.shiftEnd(-60));
    const duration = result.current.endsAt.getTime() - result.current.startsAt.getTime();
    await act(async () => result.current.shiftStart(24 * 60));
    expect(result.current.endsAt.getTime() - result.current.startsAt.getTime()).toBe(duration);
  });
});

describe('useEventForm: invio', () => {
  it('con il form vuoto mostra gli errori per campo e non chiama il server', async () => {
    const { result } = await setup();
    await act(async () => result.current.submit());
    expect(result.current.errors).toMatchObject({ venue: 'venueRequired', name: 'nameRequired' });
    expect(rpcCalls('create_event')).toHaveLength(0);
  });

  it('corretto un campo, il suo errore sparisce', async () => {
    const { result } = await setup();
    await act(async () => result.current.submit());
    await act(async () => result.current.setName('Notte'));
    expect(result.current.errors.name).toBeUndefined();
    expect(result.current.errors.venue).toBe('venueRequired');
  });

  it('con tutto valido chiama create_event con i target in array e poi chiude', async () => {
    const onDone = jest.fn();
    const { result } = await setup({ onDone });
    await act(async () => {
      result.current.setVenueId('v1');
      result.current.setName('  Notte Techno ');
      result.current.setAges(['18-24', '35+']);
      result.current.setGender('female');
    });
    await waitFor(() => expect(result.current.timeZone).toBe('Europe/Rome'));
    await act(async () => result.current.submit());
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(rpcCalls('create_event')[0]?.[1]).toMatchObject({
      p_venue_id: 'v1',
      p_name: 'Notte Techno',
      p_target_age_bands: ['18-24', '35-44', '45+'],
      p_target_genders: ['female'],
    });
  });

  it('un errore del server (limite di 10) resta a schermo come codice', async () => {
    fakeSupabase.rpc.mockImplementation(async (name: string) =>
      name === 'create_event'
        ? { data: null, error: { message: 'TOO_MANY_ACTIVE_EVENTS' } }
        : { data: [DETAIL], error: null },
    );
    const onDone = jest.fn();
    const { result } = await setup({ onDone });
    await act(async () => {
      result.current.setVenueId('v1');
      result.current.setName('Notte');
    });
    await act(async () => result.current.submit());
    await waitFor(() => expect(result.current.serverError).toBe('TOO_MANY_ACTIVE_EVENTS'));
    expect(onDone).not.toHaveBeenCalled();
  });

  it('in modifica chiama update_event con l’id della serata', async () => {
    const onDone = jest.fn();
    const { result } = await setup({
      onDone,
      editing: {
        eventId: 'e9',
        venueId: 'v1',
        timeZone: 'Europe/Rome',
        name: 'Vecchio nome',
        description: 'Testo',
        startsAt: new Date('2026-11-07T21:00:00Z'),
        endsAt: new Date('2026-11-08T03:00:00Z'),
        ageBands: ['25-34'],
        genders: [],
      },
    });
    expect(result.current.name).toBe('Vecchio nome');
    expect(result.current.ages).toEqual(['25-34']);
    await act(async () => result.current.setName('Nuovo nome'));
    await act(async () => result.current.submit());
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(rpcCalls('update_event')[0]?.[1]).toMatchObject({
      p_event_id: 'e9',
      p_name: 'Nuovo nome',
    });
    expect(rpcCalls('create_event')).toHaveLength(0);
  });
});
