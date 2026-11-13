import {
  GOOGLE_DEBOUNCE_MS,
  GOOGLE_MIN_QUERY,
  isGoogleQueryReady,
  nextSessionToken,
} from './googleSession';

let counter = 0;
const make = () => `token-${(counter += 1)}`;

describe('sessione di digitazione su Google', () => {
  beforeEach(() => {
    counter = 0;
  });

  it('debounce di 300 ms e minimo 3 caratteri', () => {
    expect(GOOGLE_DEBOUNCE_MS).toBe(300);
    expect(GOOGLE_MIN_QUERY).toBe(3);
  });

  it('cerca solo da 3 caratteri, spazi esclusi', () => {
    expect(isGoogleQueryReady('vi')).toBe(false);
    expect(isGoogleQueryReady('  vi  ')).toBe(false);
    expect(isGoogleQueryReady('via')).toBe(true);
  });

  it('il primo carattere digitato apre la sessione, i successivi la mantengono', () => {
    const first = nextSessionToken(null, 'type', make);
    expect(first).toBe('token-1');
    expect(nextSessionToken(first, 'type', make)).toBe('token-1');
    expect(counter).toBe(1);
  });

  it('dopo una selezione la sessione è chiusa: il prossimo carattere ne apre una nuova', () => {
    const closed = nextSessionToken('token-1', 'select', make);
    expect(closed).toBeNull();
    expect(nextSessionToken(closed, 'type', make)).toBe('token-1');
  });

  it('svuotare il campo chiude la sessione', () => {
    expect(nextSessionToken('token-7', 'clear', make)).toBeNull();
  });
});
