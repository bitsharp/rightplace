import { canEdit, eventWhenLabel, isTonight } from './eventRow';

const ROME = 'Europe/Rome';
// Friday 6 Nov 2026, 15:00 in Milan.
const NOW = new Date('2026-11-06T14:00:00Z');

describe('eventWhenLabel', () => {
  it('una serata di oggi è "stasera", con orario di inizio e fine locali', () => {
    const label = eventWhenLabel('2026-11-06T21:00:00Z', '2026-11-07T03:00:00Z', NOW, ROME, 'it');
    expect(label).toEqual({ day: 'tonight', date: '', time: '22:00', endTime: '04:00' });
  });

  it('dopo mezzanotte la serata di ieri è ancora "stasera"', () => {
    const afterMidnight = new Date('2026-11-06T23:30:00Z');
    const label = eventWhenLabel(
      '2026-11-06T21:00:00Z',
      '2026-11-07T03:00:00Z',
      afterMidnight,
      ROME,
      'it',
    );
    expect(label.day).toBe('tonight');
  });

  it('quella del giorno dopo è "domani"', () => {
    const label = eventWhenLabel('2026-11-07T21:00:00Z', '2026-11-08T03:00:00Z', NOW, ROME, 'it');
    expect(label.day).toBe('tomorrow');
  });

  it('oltre è una data scritta nella lingua dell’utente', () => {
    const it = eventWhenLabel('2026-11-14T21:00:00Z', '2026-11-15T03:00:00Z', NOW, ROME, 'it');
    const en = eventWhenLabel('2026-11-14T21:00:00Z', '2026-11-15T03:00:00Z', NOW, ROME, 'en');
    expect(it.day).toBe('date');
    expect(it.date).toMatch(/sab/i);
    expect(it.date).toMatch(/14/);
    expect(en.date).toMatch(/sat/i);
    expect(en.date).not.toEqual(it.date);
  });

  it('una serata passata è una data, mai "stasera"', () => {
    const label = eventWhenLabel('2026-11-01T21:00:00Z', '2026-11-02T03:00:00Z', NOW, ROME, 'it');
    expect(label.day).toBe('date');
  });

  it('usa il fuso della città: alle 22:30 UTC a Las Palmas è ancora la serata del 6', () => {
    const label = eventWhenLabel(
      '2026-11-06T22:00:00Z',
      '2026-11-07T04:00:00Z',
      new Date('2026-11-06T12:00:00Z'),
      'Atlantic/Canary',
      'it',
    );
    expect(label).toMatchObject({ day: 'tonight', time: '22:00', endTime: '04:00' });
  });
});

describe('canEdit', () => {
  const upcoming = { startsAt: '2026-11-07T21:00:00Z', cancelledAt: null };

  it('si modifica fino all’inizio', () => {
    expect(canEdit(upcoming, NOW)).toBe(true);
    expect(canEdit(upcoming, new Date('2026-11-07T21:00:00Z'))).toBe(false);
    expect(canEdit(upcoming, new Date('2026-11-07T22:00:00Z'))).toBe(false);
  });

  it('una serata annullata non si modifica', () => {
    expect(canEdit({ ...upcoming, cancelledAt: '2026-11-06T10:00:00Z' }, NOW)).toBe(false);
  });
});

describe('isTonight', () => {
  it('vero per la serata in corso e per quella di stasera, falso per domani e per ieri', () => {
    expect(isTonight('2026-11-06T21:00:00Z', NOW, ROME)).toBe(true);
    expect(isTonight('2026-11-05T21:00:00Z', new Date('2026-11-06T01:00:00Z'), ROME)).toBe(true);
    expect(isTonight('2026-11-07T21:00:00Z', NOW, ROME)).toBe(false);
    expect(isTonight('2026-11-05T21:00:00Z', NOW, ROME)).toBe(false);
  });
});
