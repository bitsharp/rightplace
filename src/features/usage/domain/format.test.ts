import { formatMinutes, formatSince } from './format';

describe('formatMinutes', () => {
  it('mostra i soli minuti sotto l’ora', () => {
    expect(formatMinutes(45, 'it')).toMatch(/^45\s*min$/);
    expect(formatMinutes(0, 'en')).toMatch(/^0\s*min$/);
  });

  it('mostra ore e minuti da un’ora in su', () => {
    expect(formatMinutes(125, 'en')).toMatch(/^2\s*hr\s+5\s*min$/);
  });

  it('omette i minuti quando sono ore piene', () => {
    expect(formatMinutes(120, 'it')).toMatch(/^2\s*h$/);
  });
});

describe('formatSince', () => {
  const now = new Date('2026-11-28T12:00:00Z');

  it('usa minuti, ore e giorni nella lingua richiesta', () => {
    expect(formatSince('2026-11-28T11:15:00Z', now, 'en')).toBe('45 minutes ago');
    expect(formatSince('2026-11-28T10:00:00Z', now, 'it')).toBe('2 ore fa');
    expect(formatSince('2026-11-25T12:00:00Z', now, 'en')).toBe('3 days ago');
  });

  it('dice "adesso" entro il primo minuto', () => {
    expect(formatSince('2026-11-28T11:59:40Z', now, 'en')).toBe('this minute');
  });
});
