import { nearestActiveCity, resolveCity, type CityPoint } from './cityChoice';

const MILANO: CityPoint = { slug: 'milano', lat: 45.4642, lng: 9.19 };
const LAS_PALMAS: CityPoint = { slug: 'las-palmas', lat: 28.1235, lng: -15.4134 };
const CITIES = [MILANO, LAS_PALMAS];

describe('nearestActiveCity', () => {
  it('sceglie la città attiva più vicina entro il raggio', () => {
    expect(nearestActiveCity({ lat: 28.15, lng: -15.43 }, CITIES)).toBe('las-palmas');
    expect(nearestActiveCity({ lat: 45.5, lng: 9.2 }, CITIES)).toBe('milano');
  });

  it('una cella a una trentina di km dal centro è ancora della città', () => {
    expect(nearestActiveCity({ lat: 45.7, lng: 9.19 }, CITIES)).toBe('milano');
  });

  it('fuori dal raggio non c’è nessuna città', () => {
    expect(nearestActiveCity({ lat: 41.9, lng: 12.5 }, CITIES)).toBeNull();
  });

  it('il raggio è regolabile', () => {
    const rho = { lat: 45.5, lng: 9.0 };
    expect(nearestActiveCity(rho, CITIES, 5)).toBeNull();
    expect(nearestActiveCity(rho, CITIES, 60)).toBe('milano');
  });

  it('senza città attive non c’è nessuna città', () => {
    expect(nearestActiveCity({ lat: 45.5, lng: 9.2 }, [])).toBeNull();
  });
});

const base = {
  detected: null,
  profileCity: null,
  fallback: 'milano',
  activeSlugs: ['milano', 'las-palmas'],
} as const;

describe('resolveCity', () => {
  it('la preferenza esplicita vince anche se la posizione dice un’altra città', () => {
    expect(resolveCity({ ...base, preference: 'milano', detected: 'las-palmas' })).toBe('milano');
  });

  it('in automatico usa la città rilevata', () => {
    expect(resolveCity({ ...base, preference: 'auto', detected: 'las-palmas' })).toBe('las-palmas');
  });

  it('in automatico senza posizione usa la città del profilo', () => {
    expect(resolveCity({ ...base, preference: 'auto', profileCity: 'las-palmas' })).toBe(
      'las-palmas',
    );
  });

  it('in automatico senza nessun dato usa il fallback', () => {
    expect(resolveCity({ ...base, preference: 'auto' })).toBe('milano');
  });

  it('una preferenza non più attiva ricade su automatico', () => {
    expect(resolveCity({ ...base, preference: 'madrid', detected: 'las-palmas' })).toBe(
      'las-palmas',
    );
  });

  it('finché l’elenco delle città non è arrivato si fida della preferenza', () => {
    expect(resolveCity({ ...base, preference: 'las-palmas', activeSlugs: null })).toBe(
      'las-palmas',
    );
  });
});
