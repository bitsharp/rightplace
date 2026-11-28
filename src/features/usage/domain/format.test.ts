import { simulateHermesIntl } from '@/test/hermesIntl';

import { describeMinutes, describeSince, parseTimestamp } from './format';

describe('describeMinutes', () => {
  it('descrive i soli minuti sotto l’ora', () => {
    expect(describeMinutes(45)).toEqual({ key: 'usage.duration.minutes', params: { count: 45 } });
    expect(describeMinutes(0)).toEqual({ key: 'usage.duration.minutes', params: { count: 0 } });
  });

  it('descrive ore e minuti da un’ora in su', () => {
    expect(describeMinutes(125)).toEqual({
      key: 'usage.duration.hoursMinutes',
      params: { hours: 2, minutes: 5 },
    });
  });

  it('descrive le ore piene senza minuti', () => {
    expect(describeMinutes(120)).toEqual({ key: 'usage.duration.hours', params: { count: 2 } });
  });

  it('non usa API Intl assenti in Hermes', () => {
    const restore = simulateHermesIntl();
    try {
      expect(() => describeMinutes(125)).not.toThrow();
    } finally {
      restore();
    }
  });
});

describe('describeSince', () => {
  const now = new Date('2026-11-28T12:00:00Z');

  it('usa minuti, ore e giorni', () => {
    expect(describeSince('2026-11-28T11:15:00Z', now)).toEqual({
      key: 'usage.since.minutes',
      params: { count: 45 },
    });
    expect(describeSince('2026-11-28T10:00:00Z', now)).toEqual({
      key: 'usage.since.hours',
      params: { count: 2 },
    });
    expect(describeSince('2026-11-25T12:00:00Z', now)).toEqual({
      key: 'usage.since.days',
      params: { count: 3 },
    });
  });

  it('dice "adesso" entro il primo minuto e "ieri" dopo un giorno', () => {
    expect(describeSince('2026-11-28T11:59:40Z', now).key).toBe('usage.since.now');
    expect(describeSince('2026-11-27T11:00:00Z', now).key).toBe('usage.since.yesterday');
  });

  it('non usa Intl.RelativeTimeFormat, assente in Hermes', () => {
    const restore = simulateHermesIntl();
    try {
      expect(() => describeSince('2026-11-28T10:00:00Z', now)).not.toThrow();
    } finally {
      restore();
    }
  });

  it('una data illeggibile vale "adesso" invece di rompere la riga', () => {
    expect(describeSince('boh', now).key).toBe('usage.since.now');
  });
});

describe('parseTimestamp', () => {
  it('legge i microsecondi di Postgres troncandoli ai millisecondi', () => {
    expect(parseTimestamp('2026-11-28T10:00:00.123456+00:00')?.toISOString()).toBe(
      '2026-11-28T10:00:00.123Z',
    );
  });

  it('restituisce null per una data non valida', () => {
    expect(parseTimestamp('boh')).toBeNull();
  });
});
