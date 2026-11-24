import { distanceKm, formatDistanceKm, roundedDistanceKm } from './distance';

const DUOMO = { lat: 45.4641, lng: 9.1919 };
const NAVIGLI = { lat: 45.4531, lng: 9.1773 };

describe('distanceKm', () => {
  it('misura la distanza in linea d’aria tra due punti', () => {
    expect(distanceKm(DUOMO, NAVIGLI)).toBeCloseTo(1.5, 0);
  });

  it('è zero tra lo stesso punto', () => {
    expect(distanceKm(DUOMO, DUOMO)).toBe(0);
  });
});

describe('roundedDistanceKm', () => {
  it('arrotonda ai 500 m: la posizione di partenza è già una cella da ~500 m (principio 3)', () => {
    expect(roundedDistanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0.0123 })).toBe(1.5);
  });

  it('non scende mai sotto i 500 m: non finge una precisione che non ha', () => {
    expect(roundedDistanceKm(DUOMO, DUOMO)).toBe(0.5);
  });
});

describe('formatDistanceKm', () => {
  it('usa il separatore decimale della lingua', () => {
    expect(formatDistanceKm(1.5, 'it')).toBe('1,5');
    expect(formatDistanceKm(1.5, 'en')).toBe('1.5');
  });

  it('non scrive decimali inutili', () => {
    expect(formatDistanceKm(2, 'en')).toBe('2');
  });
});
