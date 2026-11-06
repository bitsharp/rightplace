import { RpcError } from '@/lib/rpcError';
import { fakeSupabase } from '@/test/fakeSupabase';

import { fetchCityEvents, fetchEventDetail } from './api';

const respondWith = (data: unknown, error: unknown = null) =>
  fakeSupabase.rpc.mockResolvedValueOnce({ data, error });

const cityRow = (overrides: Record<string, unknown> = {}) => ({
  event_id: 'e1',
  name: 'Notte Techno',
  venue_id: 'v1',
  venue_name: 'Arena Club',
  venue_kind: 'club',
  lat: 45.46,
  lng: 9.19,
  starts_at: '2026-11-07T21:00:00+00:00',
  ends_at: '2026-11-08T03:00:00+00:00',
  going_band: '3–10',
  maybe_band: 'pochi',
  is_sponsored: false,
  timezone: 'Europe/Rome',
  ...overrides,
});

const detailRow = (overrides: Record<string, unknown> = {}) => ({
  event_id: 'e1',
  name: 'Notte Techno',
  description: 'Dj set',
  starts_at: '2026-11-07T21:00:00+00:00',
  ends_at: '2026-11-08T03:00:00+00:00',
  cancelled_at: null,
  target_age_bands: ['18-24'],
  target_genders: ['female'],
  venue_id: 'v1',
  venue_name: 'Arena Club',
  venue_kind: 'club',
  address: 'Via Test 1',
  lat: 45.46,
  lng: 9.19,
  city_slug: 'milano',
  timezone: 'Europe/Rome',
  taxi_number: '+39 02 8585',
  going_band: '3–10',
  maybe_band: 'pochi',
  avg_age: 24,
  female_pct: 60,
  male_pct: 40,
  other_pct: 0,
  friends: [{ handle: 'volpe.viola', age_band: '18-24', gender: 'female', intent: 'going' }],
  is_mine: false,
  creator_handle: 'lince.rosso',
  ...overrides,
});

describe('fetchCityEvents', () => {
  it('chiama get_city_events con città e testo e converte le righe', async () => {
    respondWith([cityRow()]);
    const [event] = await fetchCityEvents('milano', 'techno');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_city_events', {
      p_city_slug: 'milano',
      p_query: 'techno',
    });
    expect(event).toEqual({
      eventId: 'e1',
      name: 'Notte Techno',
      venueId: 'v1',
      venueName: 'Arena Club',
      venueKind: 'club',
      lat: 45.46,
      lng: 9.19,
      startsAt: '2026-11-07T21:00:00+00:00',
      endsAt: '2026-11-08T03:00:00+00:00',
      goingBand: '3–10',
      maybeBand: 'pochi',
      isSponsored: false,
      timezone: 'Europe/Rome',
    });
  });

  it('un testo vuoto non filtra', async () => {
    respondWith([]);
    await fetchCityEvents('milano', '  ');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_city_events', {
      p_city_slug: 'milano',
      p_query: null,
    });
  });

  it('può chiedere una finestra più corta (la mappa mostra solo stasera)', async () => {
    respondWith([]);
    await fetchCityEvents('milano', '', 1);
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_city_events', {
      p_city_slug: 'milano',
      p_query: null,
      p_days: 1,
    });
  });
});

describe('fetchEventDetail', () => {
  it('converte la riga, con amici e statistiche k-anonime', async () => {
    respondWith([detailRow()]);
    const detail = await fetchEventDetail('e1');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_event_detail', { p_event_id: 'e1' });
    expect(detail).toMatchObject({
      eventId: 'e1',
      description: 'Dj set',
      ageBands: ['18-24'],
      genders: ['female'],
      venueId: 'v1',
      timezone: 'Europe/Rome',
      avgAge: 24,
      isMine: false,
      creatorHandle: 'lince.rosso',
    });
    expect(detail.friends).toEqual([
      { handle: 'volpe.viola', ageBand: '18-24', gender: 'female', intent: 'going' },
    ]);
  });

  it('sotto le 3 persone le statistiche restano null', async () => {
    respondWith([detailRow({ avg_age: null, female_pct: null, male_pct: null, other_pct: null })]);
    await expect(fetchEventDetail('e1')).resolves.toMatchObject({
      avgAge: null,
      femalePct: null,
      malePct: null,
    });
  });

  it('senza righe: NOT_FOUND', async () => {
    respondWith([]);
    await expect(fetchEventDetail('e1')).rejects.toEqual(new RpcError('NOT_FOUND'));
  });
});
