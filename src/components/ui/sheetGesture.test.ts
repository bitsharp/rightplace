import { shouldDismissSheet } from './sheetGesture';

describe('shouldDismissSheet', () => {
  it('chiude quando il trascinamento supera un quarto dell’altezza', () => {
    expect(shouldDismissSheet({ dy: 110, vy: 0, height: 400 })).toBe(true);
  });

  it('chiude con uno swipe veloce anche se breve', () => {
    expect(shouldDismissSheet({ dy: 30, vy: 1.2, height: 400 })).toBe(true);
  });

  it('resta aperto con un trascinamento breve e lento', () => {
    expect(shouldDismissSheet({ dy: 40, vy: 0.2, height: 400 })).toBe(false);
  });

  it('resta aperto se si trascina verso l’alto', () => {
    expect(shouldDismissSheet({ dy: -200, vy: -2, height: 400 })).toBe(false);
  });

  it('non richiede più di 120 punti sui fogli alti', () => {
    expect(shouldDismissSheet({ dy: 125, vy: 0, height: 900 })).toBe(true);
  });
});
