import { closingTimeTonight } from './openingHours';

const ROME = 'Europe/Rome';
const point = (day: number, hour: number, minute = 0) => ({ day, hour, minute });
// Friday 22:00 -> Saturday 05:00, the typical club shift.
const club = { periods: [{ open: point(5, 22), close: point(6, 5) }] };

describe('closingTimeTonight', () => {
  it('di venerdì sera restituisce la chiusura dopo mezzanotte nel fuso della città', () => {
    // 23:30 in Rome on Friday 6 November 2026
    expect(closingTimeTonight(club, new Date('2026-11-06T22:30:00Z'), ROME)).toBe('05:00');
  });

  it('a notte fonda, con il locale già aperto dal giorno prima, restituisce la chiusura in corso', () => {
    // 02:00 in Rome on Saturday
    expect(closingTimeTonight(club, new Date('2026-11-07T01:00:00Z'), ROME)).toBe('05:00');
  });

  it('nel pomeriggio restituisce la chiusura della serata che deve ancora iniziare', () => {
    expect(closingTimeTonight(club, new Date('2026-11-06T17:00:00Z'), ROME)).toBe('05:00');
  });

  it('usa il fuso della città e non quello del dispositivo', () => {
    // 23:30Z: still Friday in Las Palmas (UTC+0 in winter), already Saturday 00:30 in Rome
    const saturdayClub = { periods: [{ open: point(6, 22), close: point(0, 5) }] };
    const instant = new Date('2026-11-06T23:30:00Z');
    expect(closingTimeTonight(saturdayClub, instant, ROME)).toBe('05:00');
    expect(closingTimeTonight(saturdayClub, instant, 'Atlantic/Canary')).toBeNull();
  });

  it('un bar chiuso oggi non ha un orario di chiusura', () => {
    const weekdayBar = { periods: [{ open: point(2, 18), close: point(2, 23) }] };
    expect(closingTimeTonight(weekdayBar, new Date('2026-11-06T22:30:00Z'), ROME)).toBeNull();
  });

  it('un locale già chiuso per stasera (orario finito) non ha un orario di chiusura', () => {
    const lunchOnly = { periods: [{ open: point(5, 12), close: point(5, 15) }] };
    expect(closingTimeTonight(lunchOnly, new Date('2026-11-06T22:30:00Z'), ROME)).toBeNull();
  });

  it('un periodo senza chiusura (aperto 24 ore) non ha un orario di chiusura', () => {
    expect(
      closingTimeTonight(
        { periods: [{ open: point(0, 0) }] },
        new Date('2026-11-06T22:30:00Z'),
        ROME,
      ),
    ).toBeNull();
  });

  it.each([null, undefined, 'x', 42, {}, { periods: 'x' }, { periods: [{ open: 'x' }] }])(
    'dati non validi (%p) danno null',
    (data) => {
      expect(closingTimeTonight(data, new Date('2026-11-06T22:30:00Z'), ROME)).toBeNull();
    },
  );

  it('formatta i minuti con lo zero davanti', () => {
    const late = { periods: [{ open: point(5, 22), close: point(6, 3, 5) }] };
    expect(closingTimeTonight(late, new Date('2026-11-06T22:30:00Z'), ROME)).toBe('03:05');
  });
});
