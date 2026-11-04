import { cityRegion } from './region';

const milano = { lat: 45.4642, lng: 9.19, defaultZoom: 13 };

describe('cityRegion', () => {
  it('centra la mappa sul centro della città', () => {
    expect(cityRegion(milano)).toMatchObject({ latitude: 45.4642, longitude: 9.19 });
  });

  it('a zoom più alto la regione è più piccola', () => {
    const wide = cityRegion({ ...milano, defaultZoom: 11 });
    const close = cityRegion({ ...milano, defaultZoom: 14 });
    expect(close.longitudeDelta).toBeLessThan(wide.longitudeDelta);
    expect(close.latitudeDelta).toBeLessThan(wide.latitudeDelta);
  });

  it('a zoom 13 copre circa 6 km di larghezza: il quartiere dei locali, non tutta la regione', () => {
    const { longitudeDelta } = cityRegion(milano);
    expect(longitudeDelta).toBeGreaterThan(0.04);
    expect(longitudeDelta).toBeLessThan(0.1);
  });
});
