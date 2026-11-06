import type { CityEvent } from '../api';

import { filterEvents } from './eventList';

const event = (overrides: Partial<CityEvent> & { eventId: string; name: string }): CityEvent => ({
  venueId: 'v1',
  venueName: 'Arena Club',
  venueKind: 'club',
  lat: 45.46,
  lng: 9.19,
  startsAt: '2026-11-07T21:00:00Z',
  endsAt: '2026-11-08T03:00:00Z',
  goingBand: 'pochi',
  maybeBand: 'pochi',
  isSponsored: false,
  timezone: 'Europe/Rome',
  ...overrides,
});

const events = [
  event({ eventId: 'a', name: 'Notte Techno' }),
  event({
    eventId: 'b',
    name: 'Aperitivo Rooftop',
    venueName: 'Terrazza Isola',
    venueKind: 'rooftop',
  }),
  event({ eventId: 'c', name: 'Più Tardi', venueName: 'Bar Brera', venueKind: 'bar' }),
];

const ids = (rows: CityEvent[]) => rows.map((row) => row.eventId);

describe('filterEvents', () => {
  it('senza filtri restituisce tutto', () => {
    expect(ids(filterEvents(events, { kind: null, query: '' }))).toEqual(['a', 'b', 'c']);
  });

  it('cerca nel nome della serata e in quello del locale, senza maiuscole né accenti', () => {
    expect(ids(filterEvents(events, { kind: null, query: 'TECHNO' }))).toEqual(['a']);
    expect(ids(filterEvents(events, { kind: null, query: 'terrazza' }))).toEqual(['b']);
    expect(ids(filterEvents(events, { kind: null, query: 'piu tardi' }))).toEqual(['c']);
  });

  it('filtra per tipo del locale', () => {
    expect(ids(filterEvents(events, { kind: 'rooftop', query: '' }))).toEqual(['b']);
  });

  it('combina testo e tipo', () => {
    expect(ids(filterEvents(events, { kind: 'bar', query: 'techno' }))).toEqual([]);
  });
});
