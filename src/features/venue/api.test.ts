import { RpcError } from '@/lib/rpcError';
import { fakeSupabase } from '@/test/fakeSupabase';

import { declare, fetchVenueDetail, fetchVenueStats, undeclare } from './api';

const respondWith = (data: unknown, error: unknown = null) =>
  fakeSupabase.rpc.mockResolvedValueOnce({ data, error });

const detailRow = (overrides: Record<string, unknown> = {}) => ({
  venue_id: 'v1',
  name: 'Arena Club',
  kind: 'club',
  address: 'Via Test 1, Milano',
  opening_hours: { periods: [] },
  google_place_id: 'ChIJabc',
  lat: 45.4642,
  lng: 9.19,
  city_slug: 'milano',
  city_name: 'Milano',
  country: 'IT',
  timezone: 'Europe/Rome',
  taxi_number: '+39 02 8585',
  ...overrides,
});

const statsRow = (overrides: Record<string, unknown> = {}) => ({
  going_band: '3–10',
  maybe_band: 'pochi',
  avg_age: 23,
  female_pct: 52,
  male_pct: 48,
  other_pct: 0,
  friends: [{ handle: 'volpe.viola', age_band: '18-24', gender: 'female', intent: 'going' }],
  is_sponsored: false,
  ...overrides,
});

describe('fetchVenueDetail', () => {
  it('chiama get_venue_detail e converte la riga', async () => {
    respondWith([detailRow()]);
    await expect(fetchVenueDetail('v1')).resolves.toEqual({
      venueId: 'v1',
      name: 'Arena Club',
      kind: 'club',
      address: 'Via Test 1, Milano',
      openingHours: { periods: [] },
      googlePlaceId: 'ChIJabc',
      lat: 45.4642,
      lng: 9.19,
      citySlug: 'milano',
      cityName: 'Milano',
      country: 'IT',
      timezone: 'Europe/Rome',
      taxiNumber: '+39 02 8585',
    });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_venue_detail', { p_venue_id: 'v1' });
  });

  it('senza righe il locale non esiste: NOT_FOUND', async () => {
    respondWith([]);
    await expect(fetchVenueDetail('v1')).rejects.toEqual(new RpcError('NOT_FOUND'));
  });

  it('accetta indirizzo e numero taxi assenti', async () => {
    respondWith([detailRow({ address: null, taxi_number: null })]);
    await expect(fetchVenueDetail('v1')).resolves.toMatchObject({
      address: null,
      taxiNumber: null,
    });
  });

  it('rifiuta un tipo di locale sconosciuto', async () => {
    respondWith([detailRow({ kind: 'casino' })]);
    await expect(fetchVenueDetail('v1')).rejects.toThrow();
  });

  it('trasforma un errore della RPC in RpcError', async () => {
    respondWith(null, { message: 'NOT_FOUND' });
    await expect(fetchVenueDetail('v1')).rejects.toEqual(new RpcError('NOT_FOUND'));
  });
});

describe('fetchVenueStats', () => {
  it('chiede il segmento al server e converte fasce, statistiche e amici', async () => {
    respondWith([statsRow()]);
    await expect(fetchVenueStats('v1', 'going')).resolves.toEqual({
      goingBand: '3–10',
      maybeBand: 'pochi',
      avgAge: 23,
      femalePct: 52,
      malePct: 48,
      friends: [{ handle: 'volpe.viola', ageBand: '18-24', gender: 'female', intent: 'going' }],
    });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_venue_stats', {
      p_venue_id: 'v1',
      p_segment: 'going',
    });
  });

  it('mantiene null quando il server nasconde le statistiche (meno di 3 persone)', async () => {
    respondWith([statsRow({ avg_age: null, female_pct: null, male_pct: null, friends: [] })]);
    await expect(fetchVenueStats('v1', 'maybe')).resolves.toMatchObject({
      avgAge: null,
      femalePct: null,
      malePct: null,
      friends: [],
    });
  });

  it('rifiuta una fascia che non esiste: il numero esatto non entra mai nel client', async () => {
    respondWith([statsRow({ going_band: '7' })]);
    await expect(fetchVenueStats('v1', 'all')).rejects.toThrow();
  });

  it('rifiuta un amico con dati fuori contratto', async () => {
    respondWith([
      statsRow({ friends: [{ handle: 'x.y', age_band: '33', gender: 'f', intent: 'going' }] }),
    ]);
    await expect(fetchVenueStats('v1', 'all')).rejects.toThrow();
  });
});

describe('declare e undeclare', () => {
  it('per una serata del locale passa p_venue_id', async () => {
    respondWith('decl-1');
    await declare({ kind: 'night', id: 'v1' }, 'going');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('declare', {
      p_intent: 'going',
      p_venue_id: 'v1',
    });
  });

  it('per un evento passa p_event_id', async () => {
    respondWith('decl-2');
    await declare({ kind: 'event', id: 'e1' }, 'maybe');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('declare', {
      p_intent: 'maybe',
      p_event_id: 'e1',
    });
  });

  it('propaga l’errore del server', async () => {
    respondWith(null, { message: 'VENUE_NOT_ACTIVE' });
    await expect(declare({ kind: 'night', id: 'v1' }, 'going')).rejects.toEqual(
      new RpcError('VENUE_NOT_ACTIVE'),
    );
  });

  it('undeclare chiama la RPC senza argomenti', async () => {
    respondWith(null);
    await undeclare();
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('undeclare', undefined);
  });
});
