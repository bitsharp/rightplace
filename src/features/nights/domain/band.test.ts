import { BANDS, bandRank, dominantIntent, hotSpotDiameter } from './band';

describe('band', () => {
  it('elenca le fasce di affluenza in ordine crescente', () => {
    expect(BANDS).toEqual(['pochi', '3–10', '10–20', '20–30', '30–50', '50–100', '100+']);
  });

  it('ordina le fasce', () => {
    expect(bandRank('pochi')).toBeLessThan(bandRank('3–10'));
    expect(bandRank('50–100')).toBeLessThan(bandRank('100+'));
  });
});

describe('hotSpotDiameter', () => {
  it('cresce con la fascia', () => {
    const sizes = BANDS.map(hotSpotDiameter);
    expect([...sizes].sort((a, b) => a - b)).toEqual(sizes);
    expect(new Set(sizes).size).toBe(BANDS.length);
  });

  it('non scende mai sotto il tap target di 44', () => {
    expect(hotSpotDiameter('pochi')).toBeGreaterThanOrEqual(44);
  });

  it('riprende le misure del mock-up per le fasce più comuni', () => {
    expect(hotSpotDiameter('30–50')).toBe(72);
    expect(hotSpotDiameter('50–100')).toBe(100);
  });
});

describe('dominantIntent', () => {
  it('è "Ci vado" quando i SI sono almeno quanto i FORSE', () => {
    expect(dominantIntent('30–50', '20–30')).toBe('going');
    expect(dominantIntent('20–30', '20–30')).toBe('going');
  });

  it('è "Forse" quando i FORSE superano i SI', () => {
    expect(dominantIntent('pochi', '20–30')).toBe('maybe');
  });
});
