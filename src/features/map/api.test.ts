import { RpcError } from '@/lib/rpcError';
import { fakeSupabase } from '@/test/fakeSupabase';

import { fetchCityMap, fetchMyDeclaration, fetchRecommendedVenue, fetchStories } from './api';

const mapRow = (overrides: Record<string, unknown> = {}) => ({
  venue_id: 'v1',
  name: 'Arena Club',
  kind: 'club',
  lat: 45.46,
  lng: 9.19,
  typical_level: 2,
  going_band: '3–10',
  maybe_band: 'pochi',
  is_hot_spot: true,
  is_sponsored: false,
  friends_going: null,
  friends_count: null,
  ...overrides,
});

const respondWith = (data: unknown, error: unknown = null) =>
  fakeSupabase.rpc.mockResolvedValueOnce({ data, error });

describe('fetchCityMap', () => {
  it('chiama get_city_map con città e vista e converte le righe', async () => {
    respondWith([mapRow({ friends_going: ['volpe.viola'], friends_count: 1 })]);
    await expect(fetchCityMap('milano', 'friends')).resolves.toEqual([
      {
        venueId: 'v1',
        name: 'Arena Club',
        kind: 'club',
        lat: 45.46,
        lng: 9.19,
        typicalLevel: 2,
        goingBand: '3–10',
        maybeBand: 'pochi',
        isHotSpot: true,
        isSponsored: false,
        friendsGoing: ['volpe.viola'],
        friendsCount: 1,
      },
    ]);
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_city_map', {
      p_city_slug: 'milano',
      p_view: 'friends',
    });
  });

  it('rifiuta una fascia che non esiste: il numero esatto non entra mai nel client', async () => {
    respondWith([mapRow({ going_band: '7' })]);
    await expect(fetchCityMap('milano', 'general')).rejects.toThrow();
  });

  it('rifiuta un typical_level fuori da 0–3', async () => {
    respondWith([mapRow({ typical_level: 4 })]);
    await expect(fetchCityMap('milano', 'general')).rejects.toThrow();
  });

  it('trasforma un errore della RPC in RpcError', async () => {
    respondWith(null, { message: 'CITY_NOT_ACTIVE' });
    await expect(fetchCityMap('roma', 'general')).rejects.toEqual(new RpcError('CITY_NOT_ACTIVE'));
  });
});

describe('fetchMyDeclaration', () => {
  it('restituisce la dichiarazione attiva', async () => {
    respondWith([
      {
        declaration_id: 'd1',
        venue_id: 'v1',
        venue_name: 'Arena Club',
        event_id: null,
        intent: 'going',
        expires_at: '2026-11-05T05:00:00Z',
      },
    ]);
    await expect(fetchMyDeclaration()).resolves.toEqual({
      venueId: 'v1',
      venueName: 'Arena Club',
      eventId: null,
      intent: 'going',
      expiresAt: '2026-11-05T05:00:00Z',
    });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_my_declaration', undefined);
  });

  it('riporta l’evento quando la dichiarazione è per una serata di un creator', async () => {
    respondWith([
      {
        declaration_id: 'd1',
        venue_id: 'v1',
        venue_name: 'Arena Club',
        event_id: 'e1',
        intent: 'maybe',
        expires_at: '2026-11-05T05:00:00Z',
      },
    ]);
    await expect(fetchMyDeclaration()).resolves.toMatchObject({ eventId: 'e1', intent: 'maybe' });
  });

  it('senza dichiarazione restituisce null', async () => {
    respondWith([]);
    await expect(fetchMyDeclaration()).resolves.toBeNull();
  });
});

describe('fetchStories', () => {
  it('restituisce handle e data dell’ultimo post dei seguiti', async () => {
    respondWith([{ user_id: 'u2', handle: 'volpe.viola', latest_post_at: '2026-11-04T09:00:00Z' }]);
    await expect(fetchStories()).resolves.toEqual([
      { userId: 'u2', handle: 'volpe.viola', latestPostAt: '2026-11-04T09:00:00Z' },
    ]);
  });
});

describe('fetchRecommendedVenue', () => {
  it('passa la città e restituisce il locale con il motivo', async () => {
    respondWith([{ venue_id: 'v2', name: 'Sunset Rooftop', kind: 'rooftop', reason: 'history' }]);
    await expect(fetchRecommendedVenue('milano')).resolves.toEqual({
      venueId: 'v2',
      name: 'Sunset Rooftop',
      kind: 'rooftop',
      reason: 'history',
    });
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_recommended_venue', {
      p_city_slug: 'milano',
    });
  });

  it('senza suggerimento restituisce null', async () => {
    respondWith([]);
    await expect(fetchRecommendedVenue('milano')).resolves.toBeNull();
  });

  it('rifiuta un motivo sconosciuto', async () => {
    respondWith([{ venue_id: 'v2', name: 'X', kind: 'bar', reason: 'ads' }]);
    await expect(fetchRecommendedVenue('milano')).rejects.toThrow();
  });
});
