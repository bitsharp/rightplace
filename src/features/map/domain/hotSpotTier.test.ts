import { BANDS } from '@/features/nights/domain/band';

import { hotSpotTier } from './hotSpotTier';

describe('hotSpotTier', () => {
  it.each([
    ['pochi', 'low'],
    ['3–10', 'low'],
    ['10–20', 'mid'],
    ['20–30', 'mid'],
    ['30–50', 'high'],
    ['50–100', 'high'],
    ['100+', 'high'],
  ] as const)('con la fascia %s (Ci vado) e nessuno ai Forse è %s', (band, tier) => {
    expect(hotSpotTier(band, 'pochi')).toBe(tier);
  });

  it('conta la fascia più alta tra Ci vado e Forse', () => {
    expect(hotSpotTier('pochi', '30–50')).toBe('high');
    expect(hotSpotTier('10–20', '3–10')).toBe('mid');
    expect(hotSpotTier('3–10', '20–30')).toBe('mid');
  });

  it('copre tutte le fasce', () => {
    for (const band of BANDS) expect(['low', 'mid', 'high']).toContain(hotSpotTier(band, band));
  });
});
