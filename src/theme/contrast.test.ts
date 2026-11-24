import { contrastRatio } from './contrast';
import { colors } from './tokens';

const AA = 4.5;

describe('contrastRatio', () => {
  it('vale 21 tra nero e bianco e 1 tra colori uguali', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contrastRatio('#B14CFF', '#B14CFF')).toBeCloseTo(1, 5);
  });

  it('è simmetrico', () => {
    expect(contrastRatio('#0B0B12', '#B14CFF')).toBeCloseTo(
      contrastRatio('#B14CFF', '#0B0B12'),
      10,
    );
  });

  it('rifiuta un colore non esadecimale a 6 cifre', () => {
    expect(() => contrastRatio('red', '#FFFFFF')).toThrow();
  });
});

describe('contrasto AA dei token', () => {
  it.each(['text', 'textSecondary', 'primary', 'secondary', 'female', 'male'] as const)(
    'il colore %s si legge sul fondo e sulla superficie',
    (token) => {
      expect(contrastRatio(colors[token], colors.background)).toBeGreaterThanOrEqual(AA);
      expect(contrastRatio(colors[token], colors.surface)).toBeGreaterThanOrEqual(AA);
    },
  );

  it('il testo sul viola primario e sul ciano si legge', () => {
    expect(contrastRatio(colors.onAccent, colors.primary)).toBeGreaterThanOrEqual(AA);
    expect(contrastRatio(colors.onAccent, colors.secondary)).toBeGreaterThanOrEqual(AA);
  });
});
