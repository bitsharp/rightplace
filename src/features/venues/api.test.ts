import { RpcError } from '@/lib/rpcError';
import { fakeSupabase, setFakeTable } from '@/test/fakeSupabase';

import {
  fetchActiveCities,
  fetchCityVenues,
  fetchRecentVenues,
  fetchVenueBands,
  rememberVenue,
} from './api';

const venueRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'v1',
  name: 'Locale Uno',
  kind: 'club',
  address: 'Via Uno 1',
  google_place_id: 'place-1',
  is_active: true,
  cities: { slug: 'milano', name: 'Milano' },
  ...overrides,
});

describe('venues api', () => {
  it('legge solo le città attive', async () => {
    setFakeTable('cities', [
      { id: 'c1', slug: 'milano', name: 'Milano', is_active: true },
      { id: 'c2', slug: 'madrid', name: 'Madrid', is_active: false },
      { id: 'c3', slug: 'las-palmas', name: 'Las Palmas', is_active: true },
    ]);
    await expect(fetchActiveCities()).resolves.toEqual([
      { id: 'c3', slug: 'las-palmas', name: 'Las Palmas' },
      { id: 'c1', slug: 'milano', name: 'Milano' },
    ]);
  });

  it('legge i locali attivi della città richiesta e li converte', async () => {
    setFakeTable('venues', [
      venueRow(),
      venueRow({ id: 'v2', is_active: false }),
      venueRow({ id: 'v3', cities: { slug: 'las-palmas', name: 'Las Palmas' } }),
    ]);
    await expect(fetchCityVenues('milano')).resolves.toEqual([
      {
        id: 'v1',
        name: 'Locale Uno',
        kind: 'club',
        address: 'Via Uno 1',
        googlePlaceId: 'place-1',
        cityName: 'Milano',
      },
    ]);
  });

  it('rifiuta un tipo di locale sconosciuto', async () => {
    setFakeTable('venues', [venueRow({ kind: 'teatro' })]);
    await expect(fetchCityVenues('milano')).rejects.toThrow();
  });

  it('legge le fasce con search_venues, senza testo né tipo', async () => {
    fakeSupabase.rpc.mockResolvedValueOnce({
      data: [
        { venue_id: 'v1', going_band: '20–30', maybe_band: 'pochi', is_sponsored: true },
        { venue_id: 'v2', going_band: '3–10', maybe_band: '10–20', is_sponsored: false },
      ],
      error: null,
    });
    const bands = await fetchVenueBands('milano');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('search_venues', { p_city_slug: 'milano' });
    expect(bands.get('v1')).toEqual({ goingBand: '20–30', maybeBand: 'pochi', isSponsored: true });
    expect(bands.get('v2')?.maybeBand).toBe('10–20');
  });

  it('rifiuta una fascia che non esiste (niente numeri esatti)', async () => {
    fakeSupabase.rpc.mockResolvedValueOnce({
      data: [{ venue_id: 'v1', going_band: '42', maybe_band: 'pochi', is_sponsored: false }],
      error: null,
    });
    await expect(fetchVenueBands('milano')).rejects.toThrow();
  });

  it('trasforma un errore della RPC in RpcError', async () => {
    fakeSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'CITY_NOT_ACTIVE' } });
    await expect(fetchVenueBands('madrid')).rejects.toEqual(new RpcError('CITY_NOT_ACTIVE'));
  });

  it('legge i recenti dalla cronologia propria, dal più recente', async () => {
    setFakeTable('search_history', [
      {
        venue_id: 'a',
        searched_at: '2026-11-01T10:00:00Z',
        venues: { name: 'Vecchio', is_active: true },
      },
      {
        venue_id: 'b',
        searched_at: '2026-11-03T10:00:00Z',
        venues: { name: 'Nuovo', is_active: true },
      },
    ]);
    await expect(fetchRecentVenues()).resolves.toEqual([
      { venueId: 'b', name: 'Nuovo' },
      { venueId: 'a', name: 'Vecchio' },
    ]);
  });

  it('ricorda un locale con remember_venue', async () => {
    await rememberVenue('v1');
    expect(fakeSupabase.rpc).toHaveBeenCalledWith('remember_venue', { p_venue_id: 'v1' });
  });

  it('remember_venue su un locale spento dà VENUE_NOT_ACTIVE', async () => {
    fakeSupabase.rpc.mockResolvedValueOnce({ data: null, error: { message: 'VENUE_NOT_ACTIVE' } });
    await expect(rememberVenue('v9')).rejects.toEqual(new RpcError('VENUE_NOT_ACTIVE'));
  });
});
