import {
  HANDLE_CHANGE_DAYS,
  formatHandle,
  isHandleShaped,
  nextHandleChangeAt,
  normalizeHandle,
  validateHandle,
} from './handle';

describe('formatHandle', () => {
  it('aggiunge la @ quando manca', () => {
    expect(formatHandle('lince.rosso')).toBe('@lince.rosso');
  });

  it('non la raddoppia quando c’è già', () => {
    expect(formatHandle('@lince.rosso')).toBe('@lince.rosso');
  });
});

describe('normalizeHandle', () => {
  it.each([
    ['  Luca_97 ', 'luca_97'],
    ['@Lince.Rosso', 'lince.rosso'],
    ['lu ca', 'luca'],
    ['@@luca', '@luca'],
  ])('"%s" diventa "%s"', (typed, expected) => {
    expect(normalizeHandle(typed)).toBe(expected);
  });
});

// The same cases as supabase/tests/26_custom_handle.sql (private.is_valid_handle).
describe('validateHandle', () => {
  it.each(['lince.rosso', 'lince.rosso42', 'luca_97', 'abc', 'a2345678901234567890'])(
    '"%s" è valido',
    (handle) => {
      expect(validateHandle(handle)).toEqual({ ok: true });
    },
  );

  it.each([
    ['ab', 'tooShort'],
    ['', 'tooShort'],
    ['a23456789012345678901', 'tooLong'],
    ['1luca', 'badStart'],
    ['_luca', 'badStart'],
    ['.luca', 'badStart'],
    ['luca.', 'badEnd'],
    ['luca_', 'badEnd'],
    ['lu..ca', 'doubleDot'],
    ['Luca', 'badChars'],
    ['lu ca', 'badChars'],
    ['luca-x', 'badChars'],
    ['lùca', 'badChars'],
  ])('"%s" è rifiutato con %s', (handle, error) => {
    expect(validateHandle(handle)).toEqual({ ok: false, error });
  });
});

describe('isHandleShaped', () => {
  it('accetta anche i vecchi handle generati più lunghi di 20 caratteri', () => {
    expect(isHandleShaped('fenicottero.argento999')).toBe(true);
  });

  it.each(['luca_97', 'lince.rosso'])('accetta "%s"', (handle) => {
    expect(isHandleShaped(handle)).toBe(true);
  });

  it.each(['NON VALIDO', 'a/b', '..', ''])('rifiuta "%s"', (handle) => {
    expect(isHandleShaped(handle)).toBe(false);
  });
});

describe('nextHandleChangeAt', () => {
  const now = new Date('2026-11-20T10:00:00Z');

  it('non c’è limite se non l’hai mai cambiato', () => {
    expect(nextHandleChangeAt({ changedAt: null, freeChangeUsed: true }, now)).toBeNull();
  });

  it('indica la data in cui si potrà cambiare di nuovo', () => {
    const next = nextHandleChangeAt(
      { changedAt: '2026-11-10T10:00:00Z', freeChangeUsed: true },
      now,
    );
    expect(next?.toISOString()).toBe('2026-12-10T10:00:00.000Z');
  });

  it('non c’è limite dopo 30 giorni', () => {
    expect(
      nextHandleChangeAt({ changedAt: '2026-10-20T10:00:00Z', freeChangeUsed: true }, now),
    ).toBeNull();
    expect(HANDLE_CHANGE_DAYS).toBe(30);
  });

  it('con il cambio gratuito ancora disponibile non c’è attesa, anche se l’ultimo cambio è recente', () => {
    expect(
      nextHandleChangeAt({ changedAt: '2026-11-19T10:00:00Z', freeChangeUsed: false }, now),
    ).toBeNull();
  });
});
