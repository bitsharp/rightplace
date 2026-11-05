import { formatTime } from './formatTime';

describe('formatTime', () => {
  const iso = '2026-11-07T04:00:00Z';

  it('mostra l’ora nel fuso di Milano', () => {
    expect(formatTime(iso, 'Europe/Rome', 'it')).toBe('05:00');
  });

  it('mostra l’ora nel fuso delle Canarie, diverso da Milano', () => {
    expect(formatTime(iso, 'Atlantic/Canary', 'it')).toBe('04:00');
  });

  it('usa le 24 ore anche in inglese', () => {
    expect(formatTime('2026-11-07T17:30:00Z', 'Europe/Rome', 'en')).toBe('18:30');
  });
});
