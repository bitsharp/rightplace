import type { CityEvent } from '@/features/events/api';

import { placeEventSpots } from './eventSpots';

const event = (eventId: string, venueId: string, lat = 45.46, lng = 9.19): CityEvent => ({
  eventId,
  name: `Serata ${eventId}`,
  venueId,
  venueName: `Locale ${venueId}`,
  venueKind: 'club',
  lat,
  lng,
  startsAt: '2026-11-06T21:00:00Z',
  endsAt: '2026-11-07T03:00:00Z',
  goingBand: '3–10',
  maybeBand: 'pochi',
  isSponsored: false,
  timezone: 'Europe/Rome',
});

describe('placeEventSpots', () => {
  it('un evento in un locale senza punto caldo sta sulla posizione del locale', () => {
    const [spot] = placeEventSpots([event('a', 'v1')], new Set());
    expect(spot).toMatchObject({ lat: 45.46, lng: 9.19 });
  });

  it('se il locale ha già un punto caldo l’evento si sposta per non sovrapporsi', () => {
    const [spot] = placeEventSpots([event('a', 'v1')], new Set(['v1']));
    expect(spot?.lat).not.toBe(45.46);
    expect(Math.abs((spot?.lat ?? 0) - 45.46)).toBeLessThan(0.002);
    expect(Math.abs((spot?.lng ?? 0) - 9.19)).toBeLessThan(0.002);
  });

  it('più eventi nello stesso locale non finiscono sullo stesso punto', () => {
    const spots = placeEventSpots(
      [event('a', 'v1'), event('b', 'v1'), event('c', 'v1')],
      new Set(),
    );
    const positions = new Set(spots.map((spot) => `${spot.lat}:${spot.lng}`));
    expect(positions.size).toBe(3);
  });

  it('eventi di locali diversi restano dove sono', () => {
    const spots = placeEventSpots([event('a', 'v1'), event('b', 'v2', 45.5, 9.2)], new Set());
    expect(spots.map((spot) => [spot.lat, spot.lng])).toEqual([
      [45.46, 9.19],
      [45.5, 9.2],
    ]);
  });

  it('conserva l’evento originale e non cambia l’ordine', () => {
    const spots = placeEventSpots([event('b', 'v1'), event('a', 'v2')], new Set());
    expect(spots.map((spot) => spot.event.eventId)).toEqual(['b', 'a']);
  });
});
