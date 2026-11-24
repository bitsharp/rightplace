import { typography } from './typography';

describe('typography', () => {
  it('usa Barlow Condensed ExtraBold Italic in maiuscolo per i titoli grandi', () => {
    for (const variant of ['display30', 'display26', 'display24'] as const) {
      expect(typography[variant]).toMatchObject({
        fontFamily: 'BarlowCondensed_800ExtraBold_Italic',
        textTransform: 'uppercase',
      });
    }
  });

  it('usa Barlow Condensed Bold dritto, senza maiuscolo forzato, per i sottotitoli e gli @handle', () => {
    for (const variant of ['display22', 'display17'] as const) {
      expect(typography[variant]).toMatchObject({ fontFamily: 'BarlowCondensed_700Bold' });
      expect(typography[variant]).not.toHaveProperty('textTransform');
    }
  });

  it('ingrandisce i titoli rispetto al vecchio display perché il condensato è più stretto', () => {
    expect(typography.display30.fontSize).toBeGreaterThan(30);
    expect(typography.display30.fontSize).toBeGreaterThan(typography.display26.fontSize ?? 0);
    expect(typography.display17.fontSize).toBeGreaterThanOrEqual(20);
  });

  it('usa Inter per il testo', () => {
    expect(typography.body15).toMatchObject({ fontFamily: 'Inter_400Regular', fontSize: 15 });
    expect(typography.body15Strong).toMatchObject({
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15,
    });
  });

  it('usa Space Mono con letter-spacing per le label', () => {
    expect(typography.label10).toMatchObject({
      fontFamily: 'SpaceMono_400Regular',
      fontSize: 10,
      letterSpacing: 1.2,
    });
    expect(typography.label12).toMatchObject({ fontSize: 12, letterSpacing: 1.5 });
  });
});
