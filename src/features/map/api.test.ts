import { RpcError } from '@/lib/rpcError';
import { fakeSupabase } from '@/test/fakeSupabase';

import {
  fetchBusiestTonight,
  fetchCityMap,
  fetchMyDeclaration,
  fetchRecommendedVenue,
  fetchStories,
} from './api';

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
  friends_going_ids: null,
  friends_count: null,
  is_spot: false,
  is_declarable: false,
  ...overrides,
});

const respondWith = (data: unknown, error: unknown = null) =>
  fakeSupabase.rpc.mockResolvedValueOnce({ data, error });

describe('fetchCityMap: presenze stimate', () => {
  it('una riga con is_estimate passa lo schema ma il campo non arriva al client', async () => {
    respondWith([mapRow({ is_estimate: true })]);
    const [first] = await fetchCityMap('milano', 'general');
    expect(first).toBeDefined();
    expect(first).not.toHaveProperty('isEstimate');
  });
});

describe('fetchCityMap: forma precedente della RPC', () => {
  it('senza friends_going_ids (database non aggiornato) non dà errore e non ha id', async () => {
    const { friends_going_ids: _missing, ...oldShape } = mapRow({
      friends_going: ['volpe.viola'],
      friends_count: 1,
    });
    respondWith([oldShape]);
    const rows = await fetchCityMap('milano', 'friends');
    expect(rows[0]).toMatchObject({ friendsGoing: ['volpe.viola'], friendIds: null });
  });
});

describe('fetchCityMap', () => {
  it('chiama get_city_map con città e vista e converte le righe', async () => {
    respondWith([
      mapRow({
        friends_going: ['volpe.viola'],
        friends_going_ids: ['u-volpe'],
        friends_count: 1,
      }),
    ]);
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
        friendIds: ['u-volpe'],
        friendsCount: 1,
        isSpot: false,
      },
    ]);
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_city_map', {
      p_city_slug: 'milano',
      p_view: 'friends',
    });
  });

  it('uno spot sotto k arriva con fasce null e kind spot', async () => {
    respondWith([
      mapRow({
        kind: 'spot',
        going_band: null,
        maybe_band: null,
        is_hot_spot: false,
        typical_level: 0,
        is_spot: true,
        is_declarable: true,
      }),
    ]);
    const [row] = await fetchCityMap('milano', 'general');
    expect(row).toMatchObject({ kind: 'spot', goingBand: null, maybeBand: null, isSpot: true });
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

describe('fetchRecommendedVenue: presenze stimate', () => {
  it('is_estimate passa lo schema ma il campo non arriva al client', async () => {
    respondWith([{ venue_id: 'v2', name: 'X', kind: 'bar', reason: 'hot', is_estimate: true }]);
    await expect(fetchRecommendedVenue('milano')).resolves.not.toHaveProperty('isEstimate');
  });
});

const busyRow = (overrides: Record<string, unknown> = {}) => ({
  venue_id: 'v1',
  name: 'Arena Club',
  kind: 'club',
  typical_level: 3,
  cover_photo_url: null,
  going_band: '20–30',
  maybe_band: '3–10',
  is_estimate: true,
  ...overrides,
});

describe('fetchBusiestTonight', () => {
  it('chiama get_busiest_tonight con la città e converte le righe', async () => {
    respondWith([busyRow({ cover_photo_url: 'https://lh3.googleusercontent.com/p/a' })]);
    await expect(fetchBusiestTonight('milano')).resolves.toEqual([
      {
        venueId: 'v1',
        name: 'Arena Club',
        kind: 'club',
        typicalLevel: 3,
        photoUrl: 'https://lh3.googleusercontent.com/p/a',
        goingBand: '20–30',
        maybeBand: '3–10',
      },
    ]);
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('get_busiest_tonight', {
      p_city_slug: 'milano',
    });
  });

  it('is_estimate assente passa lo schema e una foto assente è null', async () => {
    const { is_estimate: _missing, ...row } = busyRow();
    respondWith([row]);
    const [first] = await fetchBusiestTonight('milano');
    expect(first).toMatchObject({ photoUrl: null });
    expect(first).not.toHaveProperty('isEstimate');
  });

  it('rifiuta una fascia che non esiste (niente numeri esatti)', async () => {
    respondWith([busyRow({ going_band: '27' })]);
    await expect(fetchBusiestTonight('milano')).rejects.toThrow();
  });
});
