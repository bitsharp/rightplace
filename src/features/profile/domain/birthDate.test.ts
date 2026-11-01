import { isAdultOn, parseBirthDate } from './birthDate';

const TODAY = new Date(2026, 10, 1); // 1 Nov 2026, local time

describe('parseBirthDate', () => {
  it('compone una data ISO da giorno, mese e anno', () => {
    expect(parseBirthDate({ day: '7', month: '3', year: '2001' })).toBe('2001-03-07');
  });

  it('rifiuta date che non esistono', () => {
    expect(parseBirthDate({ day: '31', month: '2', year: '2001' })).toBeNull();
    expect(parseBirthDate({ day: '0', month: '1', year: '2001' })).toBeNull();
  });

  it('rifiuta valori non numerici o anni fuori scala', () => {
    expect(parseBirthDate({ day: 'aa', month: '1', year: '2001' })).toBeNull();
    expect(parseBirthDate({ day: '1', month: '1', year: '1899' })).toBeNull();
    expect(parseBirthDate({ day: '1', month: '1', year: '01' })).toBeNull();
  });
});

describe('isAdultOn', () => {
  it('è maggiorenne chi compie 18 anni oggi', () => {
    expect(isAdultOn('2008-11-01', TODAY)).toBe(true);
  });

  it('non è maggiorenne a un giorno dai 18 anni', () => {
    expect(isAdultOn('2008-11-02', TODAY)).toBe(false);
  });

  it('non è maggiorenne a 17 anni', () => {
    expect(isAdultOn('2009-05-10', TODAY)).toBe(false);
  });
});
