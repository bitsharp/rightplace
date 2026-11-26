import type { MyDeclaration } from '../api';

import type { MapVenue } from './mapLayers';
import { buildOwnSpot, coordsOfVenue } from './ownSpot';

const venue = (overrides: Partial<MapVenue> & { venueId: string }): MapVenue => ({
  name: `Locale ${overrides.venueId}`,
  kind: 'club',
  lat: 45.46,
  lng: 9.19,
  typicalLevel: 0,
  goingBand: 'pochi',
  maybeBand: 'pochi',
  isHotSpot: false,
  isSponsored: false,
  friendsGoing: null,
  friendIds: null,
  friendsCount: null,
  isSpot: false,
  ...overrides,
});

const declaration: MyDeclaration = {
  venueId: 'v1',
  venueName: 'Arena Club',
  eventId: null,
  intent: 'going',
  expiresAt: '2026-11-14T05:00:00Z',
};

describe('coordsOfVenue', () => {
  it('trova le coordinate anche se il locale non è né punto caldo né typical dot', () => {
    const rows = [venue({ venueId: 'v1', lat: 45.5, lng: 9.2, typicalLevel: 0, isHotSpot: false })];
    expect(coordsOfVenue(rows, 'v1')).toEqual({ lat: 45.5, lng: 9.2 });
  });

  it('restituisce null se il locale non è tra le righe della mappa', () => {
    expect(coordsOfVenue([venue({ venueId: 'altro' })], 'v1')).toBeNull();
  });
});

describe('buildOwnSpot', () => {
  it("senza dichiarazione non c'è nessun marker", () => {
    expect(buildOwnSpot(null, { lat: 45.5, lng: 9.2 })).toBeNull();
  });

  it('con dichiarazione e coordinate segna il locale con la mia intenzione', () => {
    expect(buildOwnSpot(declaration, { lat: 45.5, lng: 9.2 })).toEqual({
      venueId: 'v1',
      name: 'Arena Club',
      intent: 'going',
      lat: 45.5,
      lng: 9.2,
    });
  });

  it('"Forse" resta "Forse"', () => {
    const spot = buildOwnSpot({ ...declaration, intent: 'maybe' }, { lat: 1, lng: 2 });
    expect(spot?.intent).toBe('maybe');
  });

  it('senza coordinate non disegna il marker (la card resta, non serve la posizione)', () => {
    expect(buildOwnSpot(declaration, null)).toBeNull();
  });
});
