import { isVisibleTypical, typicalLabelKey, TYPICAL_LEVELS } from './typical';

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
