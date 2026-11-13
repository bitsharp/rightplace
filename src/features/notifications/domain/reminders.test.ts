import { dayAfterReminderDate, localDateKey, nextReminderDates, nightDateOf } from './reminders';

const EVERY_DAY = [0, 1, 2, 3, 4, 5, 6];
const base = { days: EVERY_DAY, time: '18:00', declaredToday: false };

describe('nextReminderDates', () => {
  it('programma alle 18:00 della città, una volta per ognuno dei prossimi 7 giorni', () => {
    // 2026-11-11 is a Wednesday; Rome is UTC+1 in November
    const dates = nextReminderDates({
      ...base,
      timezone: 'Europe/Rome',
      now: new Date('2026-11-11T10:00:00Z'),
    });
    expect(dates).toHaveLength(7);
    expect(dates[0]?.toISOString()).toBe('2026-11-11T17:00:00.000Z');
    expect(dates[6]?.toISOString()).toBe('2026-11-17T17:00:00.000Z');
  });

  it('rispetta i giorni scelti (0 = domenica)', () => {
    const dates = nextReminderDates({
      ...base,
      days: [4, 5, 6],
      timezone: 'Europe/Rome',
      now: new Date('2026-11-11T10:00:00Z'),
    });
    expect(dates.map((d) => d.toISOString())).toEqual([
      '2026-11-12T17:00:00.000Z',
      '2026-11-13T17:00:00.000Z',
      '2026-11-14T17:00:00.000Z',
    ]);
  });

  it('usa l’ora scelta nelle preferenze', () => {
    const [first] = nextReminderDates({
      ...base,
      time: '19:30',
      timezone: 'Europe/Rome',
      now: new Date('2026-11-11T10:00:00Z'),
    });
    expect(first?.toISOString()).toBe('2026-11-11T18:30:00.000Z');
  });

  it('segue l’ora legale: a fine marzo le 18:00 passano da UTC+1 a UTC+2', () => {
    const dates = nextReminderDates({
      ...base,
      timezone: 'Europe/Rome',
      now: new Date('2026-03-27T10:00:00Z'),
    });
    expect(dates.slice(0, 3).map((d) => d.toISOString())).toEqual([
      '2026-03-27T17:00:00.000Z',
      '2026-03-28T17:00:00.000Z',
      '2026-03-29T16:00:00.000Z',
    ]);
  });

  it('segue l’ora legale: a fine ottobre le 18:00 tornano a UTC+1', () => {
    const dates = nextReminderDates({
      ...base,
      timezone: 'Europe/Rome',
      now: new Date('2026-10-24T10:00:00Z'),
    });
    expect(dates.slice(0, 3).map((d) => d.toISOString())).toEqual([
      '2026-10-24T16:00:00.000Z',
      '2026-10-25T17:00:00.000Z',
      '2026-10-26T17:00:00.000Z',
    ]);
  });

  it('usa il fuso della città: alle Canarie le 18:00 di novembre sono 18:00 UTC', () => {
    const [first] = nextReminderDates({
      ...base,
      timezone: 'Atlantic/Canary',
      now: new Date('2026-11-11T10:00:00Z'),
    });
    expect(first?.toISOString()).toBe('2026-11-11T18:00:00.000Z');
  });

  it('salta oggi se l’utente ha già dichiarato', () => {
    const dates = nextReminderDates({
      ...base,
      declaredToday: true,
      timezone: 'Europe/Rome',
      now: new Date('2026-11-11T10:00:00Z'),
    });
    expect(dates).toHaveLength(6);
    expect(dates[0]?.toISOString()).toBe('2026-11-12T17:00:00.000Z');
  });

  it('salta oggi se l’ora è già passata', () => {
    const dates = nextReminderDates({
      ...base,
      timezone: 'Europe/Rome',
      now: new Date('2026-11-11T18:30:00Z'),
    });
    expect(dates[0]?.toISOString()).toBe('2026-11-12T17:00:00.000Z');
  });

  it('senza giorni scelti non programma nulla', () => {
    expect(
      nextReminderDates({
        ...base,
        days: [],
        timezone: 'Europe/Rome',
        now: new Date('2026-11-11T10:00:00Z'),
      }),
    ).toEqual([]);
  });

  it('l’orizzonte è configurabile', () => {
    expect(
      nextReminderDates({
        ...base,
        horizonDays: 2,
        timezone: 'Europe/Rome',
        now: new Date('2026-11-11T10:00:00Z'),
      }),
    ).toHaveLength(2);
  });
});

describe('dayAfterReminderDate', () => {
  it('è alle 11:00 del giorno dopo la serata, nel fuso della città', () => {
    expect(dayAfterReminderDate('2026-11-13', 'Europe/Rome').toISOString()).toBe(
      '2026-11-14T10:00:00.000Z',
    );
    expect(dayAfterReminderDate('2026-07-18', 'Europe/Rome').toISOString()).toBe(
      '2026-07-19T09:00:00.000Z',
    );
  });

  it('gestisce il cambio di mese e d’anno', () => {
    expect(dayAfterReminderDate('2026-12-31', 'Europe/Rome').toISOString()).toBe(
      '2027-01-01T10:00:00.000Z',
    );
  });
});

describe('nightDateOf', () => {
  it('ricava la data-serata dalla scadenza della dichiarazione (06:00 del giorno dopo)', () => {
    expect(nightDateOf(new Date('2026-11-14T05:00:00Z'), 'Europe/Rome')).toBe('2026-11-13');
  });

  it('vale anche per un evento che finisce alle 02:00 o alle 23:00', () => {
    expect(nightDateOf(new Date('2026-11-14T01:00:00Z'), 'Europe/Rome')).toBe('2026-11-13');
    expect(nightDateOf(new Date('2026-11-13T22:00:00Z'), 'Europe/Rome')).toBe('2026-11-13');
  });
});

describe('localDateKey', () => {
  it('è la data nel fuso della città, non in UTC', () => {
    expect(localDateKey(new Date('2026-11-13T23:30:00Z'), 'Europe/Rome')).toBe('2026-11-14');
    expect(localDateKey(new Date('2026-11-13T23:30:00Z'), 'Atlantic/Canary')).toBe('2026-11-13');
  });
});
