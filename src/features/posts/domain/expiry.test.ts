import { expiresInDays } from './expiry';

const NOW = new Date('2026-11-09T10:00:00Z');
const inHours = (hours: number) => new Date(NOW.getTime() + hours * 3_600_000).toISOString();

describe('expiresInDays', () => {
  it('conta i giorni interi per eccesso', () => {
    expect(expiresInDays(inHours(6 * 24 + 5), NOW)).toBe(7);
    expect(expiresInDays(inHours(6 * 24), NOW)).toBe(6);
    expect(expiresInDays(inHours(30), NOW)).toBe(2);
  });

  it('finché non è scaduto mostra almeno 1 giorno', () => {
    expect(expiresInDays(inHours(0.01), NOW)).toBe(1);
    expect(expiresInDays(inHours(23), NOW)).toBe(1);
  });

  it('scaduto (o data non valida) vale 0', () => {
    expect(expiresInDays(inHours(0), NOW)).toBe(0);
    expect(expiresInDays(inHours(-5), NOW)).toBe(0);
    expect(expiresInDays('non-una-data', NOW)).toBe(0);
  });
});
