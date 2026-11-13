import { DAY_ORDER, stepReminderTime, toggleDay } from './reminderTime';

describe('stepReminderTime', () => {
  it('sposta di 15 minuti in avanti e indietro', () => {
    expect(stepReminderTime('18:00', 15)).toBe('18:15');
    expect(stepReminderTime('18:00', -15)).toBe('17:45');
  });

  it('passa da una mezzanotte all’altra senza uscire da 00:00-23:45', () => {
    expect(stepReminderTime('23:45', 15)).toBe('00:00');
    expect(stepReminderTime('00:00', -15)).toBe('23:45');
  });
});

describe('toggleDay', () => {
  it('aggiunge e toglie un giorno tenendoli ordinati', () => {
    expect(toggleDay([4, 6], 5)).toEqual([4, 5, 6]);
    expect(toggleDay([4, 5, 6], 5)).toEqual([4, 6]);
  });
});

describe('DAY_ORDER', () => {
  it('mostra la settimana da lunedì a domenica', () => {
    expect(DAY_ORDER).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });
});
