import { shouldAskPermission } from './permissionAsk';

const NOW = Date.parse('2026-11-13T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;

describe('shouldAskPermission', () => {
  it('chiede alla prima dichiarazione, quando non ha mai chiesto', () => {
    expect(shouldAskPermission({ status: 'undetermined', lastAskedAt: null, now: NOW })).toBe(true);
  });

  it('non chiede mai se il permesso è già concesso', () => {
    expect(shouldAskPermission({ status: 'granted', lastAskedAt: null, now: NOW })).toBe(false);
  });

  it('non chiede mai se è stato negato in modo definitivo', () => {
    expect(shouldAskPermission({ status: 'denied', lastAskedAt: null, now: NOW })).toBe(false);
  });

  it('non chiede più di una volta ogni 7 giorni', () => {
    const askedAt = (days: number) => NOW - days * DAY;
    expect(shouldAskPermission({ status: 'undetermined', lastAskedAt: askedAt(2), now: NOW })).toBe(
      false,
    );
    expect(
      shouldAskPermission({ status: 'undetermined', lastAskedAt: askedAt(6.9), now: NOW }),
    ).toBe(false);
    expect(shouldAskPermission({ status: 'undetermined', lastAskedAt: askedAt(7), now: NOW })).toBe(
      true,
    );
  });
});
