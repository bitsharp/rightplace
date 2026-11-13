import { REMINDER_POOL_SIZE, reminderTextKey } from './reminderTexts';

describe('reminderTextKey', () => {
  it('sceglie sempre la stessa chiave per la stessa data', () => {
    expect(reminderTextKey('2026-11-13')).toBe(reminderTextKey('2026-11-13'));
  });

  it('ruota sull’intero pool, in ordine, giorno dopo giorno', () => {
    const keys = Array.from({ length: REMINDER_POOL_SIZE }, (_, i) =>
      reminderTextKey(`2026-11-${String(10 + i).padStart(2, '0')}`),
    );
    expect(new Set(keys).size).toBe(REMINDER_POOL_SIZE);
    keys.forEach((key) => expect(key).toMatch(/^reminder\.pool\.[0-3]$/));
  });
});
