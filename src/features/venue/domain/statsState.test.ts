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
      estimate: false,
    });
  });

  it('nasconde il segmento quando mancano le percentuali', () => {
    expect(statsView({ ...visible, femalePct: null }, 'all')).toEqual({
      kind: 'hidden',
      segment: 'all',
      estimate: false,
    });
    expect(statsView({ ...visible, malePct: null }, 'all').kind).toBe('hidden');
  });

  it('non ricalcola nulla: il Forse resta nascosto anche se i "Ci vado" sono visibili', () => {
    const hiddenMaybe = { avgAge: null, femalePct: null, malePct: null };
    expect(statsView(visible, 'going').kind).toBe('visible');
    expect(statsView(hiddenMaybe, 'maybe').kind).toBe('hidden');
  });
});

describe('statsView: presenze stimate', () => {
  it('statistiche null + fascia con stime: il segmento è nascosto e lo segnala', () => {
    expect(
      statsView({ avgAge: null, femalePct: null, malePct: null, isEstimate: true }, 'going'),
    ).toEqual({ kind: 'hidden', segment: 'going', estimate: true });
  });

  it('senza stime il nascosto non porta il segnale', () => {
    expect(statsView({ avgAge: null, femalePct: null, malePct: null }, 'going')).toEqual({
      kind: 'hidden',
      segment: 'going',
      estimate: false,
    });
  });

  it('le stime non sbloccano nulla: con età null restano nascosti anche se is_estimate è true', () => {
    expect(
      statsView({ avgAge: null, femalePct: 50, malePct: 50, isEstimate: true }, 'all').kind,
    ).toBe('hidden');
  });
});
