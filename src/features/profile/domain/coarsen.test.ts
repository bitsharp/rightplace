import { coarsen } from './coarsen';

// Haversine distance in metres, only to check the grid size.
function distance(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLng = (b.lng - a.lng) * rad;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(h));
}

describe('coarsen (client)', () => {
  it('sposta il punto tra 100 e 700 m, come la funzione SQL', () => {
    const point = { lat: 45.4642, lng: 9.19 };
    const moved = distance(point, coarsen(point));
    expect(moved).toBeGreaterThanOrEqual(100);
    expect(moved).toBeLessThanOrEqual(700);
  });

  it('porta due punti vicini della stessa cella nello stesso punto', () => {
    expect(coarsen({ lat: 45.4641, lng: 9.1901 })).toEqual(coarsen({ lat: 45.4633, lng: 9.1912 }));
  });

  it('usa il centro della cella da 0,005°', () => {
    expect(coarsen({ lat: 45.4641, lng: 9.1901 })).toEqual({ lat: 45.4625, lng: 9.1925 });
  });
});
