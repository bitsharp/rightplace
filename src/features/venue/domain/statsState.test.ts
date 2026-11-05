import { statsView } from './statsState';

const visible = { avgAge: 23, femalePct: 52, malePct: 48 };

describe('statsView', () => {
  it('mostra età media e percentuali quando il server le ha restituite', () => {
    expect(statsView(visible, 'going')).toEqual({
      kind: 'visible',
      avgAge: 23,
      femalePct: 52,
      malePct: 48,
    });
  });

  it('nasconde il segmento quando l’età media è null (meno di 3 persone)', () => {
    expect(statsView({ ...visible, avgAge: null }, 'maybe')).toEqual({
      kind: 'hidden',
      segment: 'maybe',
    });
  });

  it('nasconde il segmento quando mancano le percentuali', () => {
    expect(statsView({ ...visible, femalePct: null }, 'all')).toEqual({
      kind: 'hidden',
      segment: 'all',
    });
    expect(statsView({ ...visible, malePct: null }, 'all').kind).toBe('hidden');
  });

  it('non ricalcola nulla: il Forse resta nascosto anche se i "Ci vado" sono visibili', () => {
    const hiddenMaybe = { avgAge: null, femalePct: null, malePct: null };
    expect(statsView(visible, 'going').kind).toBe('visible');
    expect(statsView(hiddenMaybe, 'maybe').kind).toBe('hidden');
  });
});
