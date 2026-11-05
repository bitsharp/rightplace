import { nightLabelKey } from './nightLabel';

// Local-time dates: the night of the 8th runs until 06:00 of the 9th.
const at = (day: number, hour: number) => new Date(2026, 10, day, hour, 0, 0);

describe('nightLabelKey', () => {
  it('il giorno dopo (dalle 06:00) la serata è "ieri sera"', () => {
    expect(nightLabelKey('2026-11-08', at(9, 10))).toEqual({ key: 'lastNight' });
  });

  it('prima delle 06:00 la serata è ancora in corso: "stasera"', () => {
    expect(nightLabelKey('2026-11-08', at(9, 2))).toEqual({ key: 'tonight' });
    expect(nightLabelKey('2026-11-08', at(8, 22))).toEqual({ key: 'tonight' });
  });

  it('più indietro nel tempo conta i giorni', () => {
    expect(nightLabelKey('2026-11-08', at(11, 12))).toEqual({ key: 'daysAgo', days: 3 });
  });

  it('senza data (serata rimossa) non inventa nulla', () => {
    expect(nightLabelKey(null, at(9, 10))).toEqual({ key: 'none' });
  });
});
