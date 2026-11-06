import {
  instantFromWallTime,
  nightEndOf,
  shiftWallTime,
  wallTimeIn,
  type WallTime,
} from './zonedTime';

const ROME = 'Europe/Rome';
const wall = (month: number, day: number, hour: number, minute = 0): WallTime => ({
  year: 2026,
  month,
  day,
  hour,
  minute,
});

describe('wallTimeIn', () => {
  it('legge l’ora locale della città, non quella del dispositivo', () => {
    expect(wallTimeIn(new Date('2026-11-06T21:30:00Z'), ROME)).toEqual(wall(11, 6, 22, 30));
    expect(wallTimeIn(new Date('2026-11-06T21:30:00Z'), 'Atlantic/Canary')).toEqual(
      wall(11, 6, 21, 30),
    );
  });

  it('usa il fuso estivo ad agosto', () => {
    expect(wallTimeIn(new Date('2026-08-06T20:00:00Z'), ROME)).toEqual({
      ...wall(8, 6, 22),
    });
  });
});

describe('instantFromWallTime', () => {
  it('è l’inverso di wallTimeIn', () => {
    const instant = instantFromWallTime(wall(11, 6, 22, 30), ROME);
    expect(instant.toISOString()).toBe('2026-11-06T21:30:00.000Z');
  });

  it('regge il cambio dell’ora legale (ottobre: 02:30 esiste una volta)', () => {
    const instant = instantFromWallTime({ ...wall(10, 25, 3, 0) }, ROME);
    expect(wallTimeIn(instant, ROME)).toEqual(wall(10, 25, 3, 0));
  });
});

describe('shiftWallTime', () => {
  it('somma minuti sull’orologio locale oltre la mezzanotte', () => {
    expect(shiftWallTime(wall(11, 6, 23, 30), 60)).toEqual(wall(11, 7, 0, 30));
  });

  it('somma giorni (1440 minuti) senza toccare l’ora', () => {
    expect(shiftWallTime(wall(11, 30, 22, 0), 1440)).toEqual(wall(12, 1, 22, 0));
  });
});

describe('nightEndOf', () => {
  it('una serata che inizia alle 22:00 finisce alle 06:00 del giorno dopo, ora locale', () => {
    const end = nightEndOf(new Date('2026-11-06T21:00:00Z'), ROME);
    expect(wallTimeIn(end, ROME)).toEqual(wall(11, 7, 6, 0));
  });

  it('dopo mezzanotte la serata è ancora quella di ieri (la data cambia alle 06:00)', () => {
    const end = nightEndOf(instantFromWallTime(wall(11, 7, 1, 0), ROME), ROME);
    expect(wallTimeIn(end, ROME)).toEqual(wall(11, 7, 6, 0));
  });

  it('alle 06:00 in punto inizia già la serata successiva', () => {
    const end = nightEndOf(instantFromWallTime(wall(11, 7, 6, 0), ROME), ROME);
    expect(wallTimeIn(end, ROME)).toEqual(wall(11, 8, 6, 0));
  });

  it('usa il fuso della città (Las Palmas)', () => {
    const end = nightEndOf(new Date('2026-11-06T22:00:00Z'), 'Atlantic/Canary');
    expect(end.toISOString()).toBe('2026-11-07T06:00:00.000Z');
  });
});
