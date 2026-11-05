import { toE164 } from './phone';

describe('toE164', () => {
  it.each([
    ['345 123 4567', '+393451234567'],
    ['+39 345 1234567', '+393451234567'],
    ['0039 345 1234567', '+393451234567'],
    ['(345) 123-4567', '+393451234567'],
    ['tel: 345.123.4567', '+393451234567'],
    ['345 123456', '+39345123456'],
  ])('normalizza il cellulare italiano %s', (raw, expected) => {
    expect(toE164(raw, 'IT')).toBe(expected);
  });

  it('mantiene lo 0 iniziale dei fissi italiani', () => {
    expect(toE164('02 1234567', 'IT')).toBe('+39021234567');
    expect(toE164('+39 02 1234567', 'IT')).toBe('+39021234567');
  });

  it('normalizza i numeri spagnoli, con o senza prefisso', () => {
    expect(toE164('+34 612 345 678', 'IT')).toBe('+34612345678');
    expect(toE164('612345678', 'ES')).toBe('+34612345678');
    expect(toE164('912 345 678', 'ES')).toBe('+34912345678');
  });

  it('accetta numeri esteri con prefisso internazionale', () => {
    expect(toE164('+44 20 7946 0958', 'IT')).toBe('+442079460958');
    expect(toE164('0044 20 7946 0958', 'ES')).toBe('+442079460958');
  });

  it('scarta numeri spagnoli che non hanno 9 cifre o non iniziano per 6-9', () => {
    expect(toE164('512345678', 'ES')).toBeNull();
    expect(toE164('61234567', 'ES')).toBeNull();
    expect(toE164('+34 12345', 'IT')).toBeNull();
  });

  it('scarta numeri italiani con forma impossibile', () => {
    expect(toE164('145 123 4567', 'IT')).toBeNull();
    expect(toE164('3451', 'IT')).toBeNull();
    expect(toE164('+39 345', 'IT')).toBeNull();
  });

  it.each([
    '',
    '   ',
    'abc',
    '345 abc 4567',
    'tel:',
    '+',
    '12345',
    '345+1234567',
    '1234567890123456',
  ])('scarta la stringa non valida "%s"', (raw) => {
    expect(toE164(raw, 'IT')).toBeNull();
  });

  it('senza prefisso e con paese sconosciuto non indovina', () => {
    expect(toE164('345 123 4567', 'FR')).toBeNull();
    expect(toE164('+33 6 12 34 56 78', 'FR')).toBe('+33612345678');
  });

  it('scarta numeri internazionali troppo lunghi o corti', () => {
    expect(toE164('+1234', 'IT')).toBeNull();
    expect(toE164('+1234567890123456', 'IT')).toBeNull();
  });
});
