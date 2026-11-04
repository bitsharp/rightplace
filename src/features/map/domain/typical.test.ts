import { isVisibleTypical, typicalDotDiameter, typicalLabelKey, TYPICAL_LEVELS } from './typical';

describe('typicalDotDiameter', () => {
  it('ha tre taglie crescenti, una per livello', () => {
    const sizes = [1, 2, 3].map((level) => typicalDotDiameter(level as 1 | 2 | 3));
    expect([...sizes].sort((a, b) => a - b)).toEqual(sizes);
    expect(new Set(sizes).size).toBe(3);
  });

  it('è sempre visibile: almeno 12 punti', () => {
    expect(typicalDotDiameter(1)).toBeGreaterThanOrEqual(12);
  });

  it('resta più piccolo del più piccolo punto caldo, così i due strati non si confondono', () => {
    expect(typicalDotDiameter(3)).toBeLessThan(44);
  });
});

describe('typicalLabelKey', () => {
  it('descrive il livello a parole, mai con numeri', () => {
    expect(typicalLabelKey(1)).toBe('quiet');
    expect(typicalLabelKey(2)).toBe('lively');
    expect(typicalLabelKey(3)).toBe('packed');
  });
});

describe('TYPICAL_LEVELS', () => {
  it('va da 0 (chiuso o vuoto) a 3 (pieno)', () => {
    expect(TYPICAL_LEVELS).toEqual([0, 1, 2, 3]);
  });
});

describe('isVisibleTypical', () => {
  it('solo i livelli da 1 in su disegnano un punto', () => {
    expect(TYPICAL_LEVELS.filter(isVisibleTypical)).toEqual([1, 2, 3]);
  });
});
