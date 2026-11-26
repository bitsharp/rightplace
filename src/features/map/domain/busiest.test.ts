import { weekdayName } from './busiest';

describe('weekdayName', () => {
  it('scrive il giorno della settimana nella lingua dell’utente', () => {
    const friday = new Date('2026-11-27T20:00:00Z');
    expect(weekdayName(friday, 'it', 'Europe/Rome')).toBe('venerdì');
    expect(weekdayName(friday, 'en', 'Europe/Rome')).toBe('Friday');
  });

  it('segue il fuso della città: poco dopo mezzanotte a Milano è già sabato', () => {
    const lateFriday = new Date('2026-11-27T23:30:00Z');
    expect(weekdayName(lateFriday, 'it', 'Europe/Rome')).toBe('sabato');
    expect(weekdayName(lateFriday, 'it', 'America/Los_Angeles')).toBe('venerdì');
  });
});
