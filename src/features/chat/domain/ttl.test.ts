import { chatExpiryHours } from './ttl';

const now = new Date('2026-11-09T10:00:00Z');
const inHours = (hours: number) => new Date(now.getTime() + hours * 3_600_000).toISOString();

describe('chatExpiryHours', () => {
  it('con più di 12 ore non mostra nulla', () => {
    expect(chatExpiryHours(inHours(12), now)).toBeNull();
    expect(chatExpiryHours(inHours(40), now)).toBeNull();
  });

  it('sotto le 12 ore arrotonda per eccesso alle ore intere', () => {
    expect(chatExpiryHours(inHours(11.2), now)).toBe(12);
    expect(chatExpiryHours(inHours(3), now)).toBe(3);
    expect(chatExpiryHours(inHours(0.2), now)).toBe(1);
  });

  it('una chat già scaduta non mostra il conto alla rovescia', () => {
    expect(chatExpiryHours(inHours(-1), now)).toBeNull();
    expect(chatExpiryHours(inHours(0), now)).toBeNull();
  });
});
